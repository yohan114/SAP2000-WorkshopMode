/**
 * EXIF Validation Library
 * Extracts and validates EXIF metadata from photos to detect manipulation and ensure authenticity
 */

// EXIF Data Interface
export interface ExifData {
  capturedAt?: Date;
  deviceMake?: string;
  deviceModel?: string;
  software?: string;
  gpsLatitude?: number;
  gpsLongitude?: number;
  altitude?: number;
  orientation?: number;
  exposureTime?: number;
  fNumber?: number;
  iso?: number;
  focalLength?: number;
  imageWidth?: number;
  imageHeight?: number;
  modifiedAt?: Date;
}

// Warning Types
export type ExifWarningType = 
  | 'MISSING_CAPTURE_DATE' 
  | 'DATE_MISMATCH' 
  | 'LOCATION_MISMATCH' 
  | 'SOFTWARE_MODIFIED' 
  | 'SUSPICIOUS_EDIT' 
  | 'DEVICE_MISMATCH'
  | 'METADATA_STRIPPED' 
  | 'FUTURE_DATE';

export type ExifWarningSeverity = 'LOW' | 'MEDIUM' | 'HIGH';

export interface ExifWarning {
  type: ExifWarningType;
  severity: ExifWarningSeverity;
  message: string;
}

export interface ExifValidationResult {
  isValid: boolean;
  warnings: ExifWarning[];
  extracted: ExifData;
  trustScore: number; // 0-100
}

export interface ExifValidationContext {
  expectedDateRange?: { start: Date; end: Date };
  expectedLocation?: { lat: number; lng: number; radiusMeters: number };
  allowedDevices?: string[];
}

// EXIF Tag IDs (standard TIFF/EXIF tags)
const EXIF_TAGS = {
  // TIFF tags
  0x010F: 'Make',
  0x0110: 'Model',
  0x0112: 'Orientation',
  0x011A: 'XResolution',
  0x011B: 'YResolution',
  0x0128: 'ResolutionUnit',
  0x0131: 'Software',
  0x0132: 'DateTime',
  0x8769: 'ExifIFDPointer',
  0x8825: 'GPSInfoIFDPointer',
  
  // EXIF IFD tags
  0x829A: 'ExposureTime',
  0x829D: 'FNumber',
  0x8827: 'ISOSpeedRatings',
  0x9003: 'DateTimeOriginal',
  0x9004: 'DateTimeDigitized',
  0x920A: 'FocalLength',
  0xA002: 'ExifImageWidth',
  0xA003: 'ExifImageHeight',
  
  // GPS tags
  0x0000: 'GPSVersionID',
  0x0001: 'GPSLatitudeRef',
  0x0002: 'GPSLatitude',
  0x0003: 'GPSLongitudeRef',
  0x0004: 'GPSLongitude',
  0x0005: 'GPSAltitudeRef',
  0x0006: 'GPSAltitude',
  0x0007: 'GPSTimeStamp',
  0x001D: 'GPSDateStamp',
};

// Trust score penalties
const TRUST_SCORE_PENALTIES: Record<ExifWarningType, number> = {
  MISSING_CAPTURE_DATE: 30,
  DATE_MISMATCH: 40,
  SOFTWARE_MODIFIED: 20,
  METADATA_STRIPPED: 50,
  FUTURE_DATE: 50,
  DEVICE_MISMATCH: 10,
  LOCATION_MISMATCH: 15,
  SUSPICIOUS_EDIT: 25,
};

const NO_GPS_PENALTY = 5;

/**
 * Read a 16-bit value from buffer (big-endian or little-endian)
 */
function readUint16(buffer: Buffer, offset: number, bigEndian: boolean): number {
  if (bigEndian) {
    return buffer.readUInt16BE(offset);
  }
  return buffer.readUInt16LE(offset);
}

/**
 * Read a 32-bit value from buffer (big-endian or little-endian)
 */
function readUint32(buffer: Buffer, offset: number, bigEndian: boolean): number {
  if (bigEndian) {
    return buffer.readUInt32BE(offset);
  }
  return buffer.readUInt32LE(offset);
}

/**
 * Parse EXIF date/time string to Date object
 * Format: "YYYY:MM:DD HH:MM:SS"
 */
function parseExifDateTime(dateTimeStr: string): Date | undefined {
  if (!dateTimeStr || dateTimeStr.length < 19) return undefined;
  
  try {
    const year = parseInt(dateTimeStr.substring(0, 4), 10);
    const month = parseInt(dateTimeStr.substring(5, 7), 10) - 1;
    const day = parseInt(dateTimeStr.substring(8, 10), 10);
    const hour = parseInt(dateTimeStr.substring(11, 13), 10);
    const minute = parseInt(dateTimeStr.substring(14, 16), 10);
    const second = parseInt(dateTimeStr.substring(17, 19), 10);
    
    if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
    
    return new Date(year, month, day, hour, minute, second);
  } catch {
    return undefined;
  }
}

/**
 * Convert GPS coordinates from EXIF format to decimal degrees
 */
function convertGpsToDecimal(
  values: number[], 
  ref: string
): number | undefined {
  if (!values || values.length < 3) return undefined;
  
  const degrees = values[0];
  const minutes = values[1];
  const seconds = values[2];
  
  let decimal = degrees + (minutes / 60) + (seconds / 3600);
  
  if (ref === 'S' || ref === 'W') {
    decimal = -decimal;
  }
  
  return decimal;
}

/**
 * Parse rational number from EXIF data
 */
function parseRational(buffer: Buffer, offset: number, bigEndian: boolean): number {
  const numerator = readUint32(buffer, offset, bigEndian);
  const denominator = readUint32(buffer, offset + 4, bigEndian);
  
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Extract string value from buffer
 */
function extractString(buffer: Buffer, offset: number, count: number): string {
  let end = offset + count - 1;
  while (end >= offset && buffer[end] === 0) end--;
  return buffer.toString('utf8', offset, end + 1);
}

/**
 * Parse IFD (Image File Directory) entries
 */
function parseIFD(
  buffer: Buffer, 
  ifdOffset: number, 
  bigEndian: boolean,
  tiffStart: number
): Map<number, { type: number; count: number; valueOffset: number }> {
  const entries = new Map<number, { type: number; count: number; valueOffset: number }>();
  
  const numEntries = readUint16(buffer, ifdOffset, bigEndian);
  
  for (let i = 0; i < numEntries; i++) {
    const entryOffset = ifdOffset + 2 + (i * 12);
    
    if (entryOffset + 12 > buffer.length) break;
    
    const tag = readUint16(buffer, entryOffset, bigEndian);
    const type = readUint16(buffer, entryOffset + 2, bigEndian);
    const count = readUint32(buffer, entryOffset + 4, bigEndian);
    const valueOffset = entryOffset + 8;
    
    entries.set(tag, { type, count, valueOffset });
  }
  
  return entries;
}

/**
 * Extract EXIF data from JPEG buffer
 */
export async function extractExif(buffer: Buffer): Promise<ExifData> {
  const exifData: ExifData = {};
  
  try {
    // Check for JPEG signature
    if (buffer[0] !== 0xFF || buffer[1] !== 0xD8) {
      console.log('[EXIF] Not a valid JPEG file');
      return exifData;
    }
    
    // Find APP1 marker (EXIF data)
    let offset = 2;
    let foundExif = false;
    
    while (offset < buffer.length - 4) {
      if (buffer[offset] !== 0xFF) {
        offset++;
        continue;
      }
      
      const marker = buffer[offset + 1];
      
      // APP1 marker (0xE1) contains EXIF
      if (marker === 0xE1) {
        const app1Length = readUint16(buffer, offset + 2, true);
        const exifStart = offset + 4;
        
        // Check for "Exif\0\0" signature
        if (buffer.toString('ascii', exifStart, exifStart + 6) === 'Exif\x00\x00') {
          foundExif = true;
          const tiffStart = exifStart + 6;
          await parseTiffData(buffer, tiffStart, exifData);
        }
        
        offset += 2 + app1Length;
        break;
      }
      
      // Skip other markers
      if (marker >= 0xE0 && marker <= 0xEF) {
        const length = readUint16(buffer, offset + 2, true);
        offset += 2 + length;
      } else if (marker === 0xDA) {
        // Start of image data - stop searching
        break;
      } else {
        offset += 2;
      }
    }
    
    if (!foundExif) {
      console.log('[EXIF] No EXIF data found in image');
    }
  } catch (error) {
    console.error('[EXIF] Error extracting EXIF data:', error);
  }
  
  return exifData;
}

/**
 * Parse TIFF header and extract EXIF data
 */
async function parseTiffData(
  buffer: Buffer, 
  tiffStart: number, 
  exifData: ExifData
): Promise<void> {
  // Read byte order
  const byteOrder = buffer.toString('ascii', tiffStart, tiffStart + 2);
  const bigEndian = byteOrder === 'MM';
  
  if (byteOrder !== 'II' && byteOrder !== 'MM') {
    console.log('[EXIF] Invalid TIFF byte order');
    return;
  }
  
  // Verify TIFF magic number (42)
  const magic = readUint16(buffer, tiffStart + 2, bigEndian);
  if (magic !== 42) {
    console.log('[EXIF] Invalid TIFF magic number');
    return;
  }
  
  // Get offset to first IFD
  const ifd0Offset = tiffStart + readUint32(buffer, tiffStart + 4, bigEndian);
  
  // Parse IFD0 (main image metadata)
  const ifd0Entries = parseIFD(buffer, ifd0Offset, bigEndian, tiffStart);
  
  let exifIfdOffset: number | undefined;
  let gpsIfdOffset: number | undefined;
  
  // Process IFD0 entries
  for (const [tag, entry] of ifd0Entries) {
    const { type, count, valueOffset } = entry;
    
    switch (tag) {
      case 0x010F: // Make
        exifData.deviceMake = getStringValue(buffer, valueOffset, type, count, bigEndian, tiffStart);
        break;
        
      case 0x0110: // Model
        exifData.deviceModel = getStringValue(buffer, valueOffset, type, count, bigEndian, tiffStart);
        break;
        
      case 0x0112: // Orientation
        exifData.orientation = getNumericValue(buffer, valueOffset, type, count, bigEndian);
        break;
        
      case 0x0131: // Software
        exifData.software = getStringValue(buffer, valueOffset, type, count, bigEndian, tiffStart);
        break;
        
      case 0x0132: // DateTime (modified)
        const modDateStr = getStringValue(buffer, valueOffset, type, count, bigEndian, tiffStart);
        exifData.modifiedAt = parseExifDateTime(modDateStr || '');
        break;
        
      case 0x8769: // ExifIFDPointer
        exifIfdOffset = tiffStart + (getNumericValue(buffer, valueOffset, type, count, bigEndian) || 0);
        break;
        
      case 0x8825: // GPSInfoIFDPointer
        gpsIfdOffset = tiffStart + (getNumericValue(buffer, valueOffset, type, count, bigEndian) || 0);
        break;
    }
  }
  
  // Parse Exif IFD
  if (exifIfdOffset) {
    const exifEntries = parseIFD(buffer, exifIfdOffset, bigEndian, tiffStart);
    
    for (const [tag, entry] of exifEntries) {
      const { type, count, valueOffset } = entry;
      
      switch (tag) {
        case 0x829A: // ExposureTime
          exifData.exposureTime = getRationalValue(buffer, valueOffset, type, count, bigEndian, tiffStart);
          break;
          
        case 0x829D: // FNumber
          exifData.fNumber = getRationalValue(buffer, valueOffset, type, count, bigEndian, tiffStart);
          break;
          
        case 0x8827: // ISOSpeedRatings
          exifData.iso = getNumericValue(buffer, valueOffset, type, count, bigEndian);
          break;
          
        case 0x9003: // DateTimeOriginal (capture date)
          const captureDateStr = getStringValue(buffer, valueOffset, type, count, bigEndian, tiffStart);
          exifData.capturedAt = parseExifDateTime(captureDateStr || '');
          break;
          
        case 0x9004: // DateTimeDigitized
          // Could be useful for additional validation
          break;
          
        case 0x920A: // FocalLength
          exifData.focalLength = getRationalValue(buffer, valueOffset, type, count, bigEndian, tiffStart);
          break;
          
        case 0xA002: // ExifImageWidth
          exifData.imageWidth = getNumericValue(buffer, valueOffset, type, count, bigEndian);
          break;
          
        case 0xA003: // ExifImageHeight
          exifData.imageHeight = getNumericValue(buffer, valueOffset, type, count, bigEndian);
          break;
      }
    }
  }
  
  // Parse GPS IFD
  if (gpsIfdOffset) {
    const gpsEntries = parseIFD(buffer, gpsIfdOffset, bigEndian, tiffStart);
    
    let latRef: string | undefined;
    let latValues: number[] | undefined;
    let lonRef: string | undefined;
    let lonValues: number[] | undefined;
    let altitudeRef = 0;
    
    for (const [tag, entry] of gpsEntries) {
      const { type, count, valueOffset } = entry;
      
      switch (tag) {
        case 0x0001: // GPSLatitudeRef
          latRef = getStringValue(buffer, valueOffset, type, count, bigEndian, tiffStart);
          break;
          
        case 0x0002: // GPSLatitude
          latValues = getRationalArray(buffer, valueOffset, type, count, bigEndian, tiffStart);
          break;
          
        case 0x0003: // GPSLongitudeRef
          lonRef = getStringValue(buffer, valueOffset, type, count, bigEndian, tiffStart);
          break;
          
        case 0x0004: // GPSLongitude
          lonValues = getRationalArray(buffer, valueOffset, type, count, bigEndian, tiffStart);
          break;
          
        case 0x0005: // GPSAltitudeRef
          altitudeRef = getNumericValue(buffer, valueOffset, type, count, bigEndian) || 0;
          break;
          
        case 0x0006: // GPSAltitude
          const alt = getRationalValue(buffer, valueOffset, type, count, bigEndian, tiffStart);
          if (alt !== undefined) {
            exifData.altitude = altitudeRef === 1 ? -alt : alt;
          }
          break;
      }
    }
    
    // Convert GPS coordinates
    if (latValues && latRef) {
      exifData.gpsLatitude = convertGpsToDecimal(latValues, latRef);
    }
    if (lonValues && lonRef) {
      exifData.gpsLongitude = convertGpsToDecimal(lonValues, lonRef);
    }
  }
}

/**
 * Get string value from EXIF entry
 */
function getStringValue(
  buffer: Buffer, 
  valueOffset: number, 
  type: number, 
  count: number, 
  bigEndian: boolean,
  tiffStart: number
): string | undefined {
  try {
    // Type 2 is ASCII string
    if (type === 2) {
      // If value fits in 4 bytes, it's stored inline
      if (count <= 4) {
        return extractString(buffer, valueOffset, count);
      }
      // Otherwise, get offset to value
      const offset = tiffStart + readUint32(buffer, valueOffset, bigEndian);
      return extractString(buffer, offset, count);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get numeric value from EXIF entry
 */
function getNumericValue(
  buffer: Buffer, 
  valueOffset: number, 
  type: number, 
  count: number, 
  bigEndian: boolean
): number | undefined {
  try {
    // For single values stored inline
    if (type === 1 || type === 2) { // BYTE or ASCII
      return buffer[valueOffset];
    } else if (type === 3) { // SHORT
      if (count === 1) {
        return readUint16(buffer, valueOffset, bigEndian);
      }
    } else if (type === 4) { // LONG
      if (count === 1) {
        return readUint32(buffer, valueOffset, bigEndian);
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get rational value from EXIF entry
 */
function getRationalValue(
  buffer: Buffer, 
  valueOffset: number, 
  type: number, 
  count: number, 
  bigEndian: boolean,
  tiffStart: number
): number | undefined {
  try {
    // Type 5 is RATIONAL
    if (type === 5) {
      const offset = count === 1 ? readUint32(buffer, valueOffset, bigEndian) : readUint32(buffer, valueOffset, bigEndian);
      const rationalOffset = tiffStart + offset;
      return parseRational(buffer, rationalOffset, bigEndian);
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Get array of rational values from EXIF entry
 */
function getRationalArray(
  buffer: Buffer, 
  valueOffset: number, 
  type: number, 
  count: number, 
  bigEndian: boolean,
  tiffStart: number
): number[] | undefined {
  try {
    // Type 5 is RATIONAL
    if (type === 5) {
      const offset = tiffStart + readUint32(buffer, valueOffset, bigEndian);
      const values: number[] = [];
      
      // GPS coordinates have 3 rationals (degrees, minutes, seconds)
      for (let i = 0; i < count; i++) {
        values.push(parseRational(buffer, offset + (i * 8), bigEndian));
      }
      
      return values;
    }
    return undefined;
  } catch {
    return undefined;
  }
}

/**
 * Validate EXIF data against context constraints
 */
export function validateExif(
  exifData: ExifData,
  context: ExifValidationContext = {}
): ExifValidationResult {
  const warnings: ExifWarning[] = [];
  
  // Check for missing capture date
  if (!exifData.capturedAt) {
    warnings.push({
      type: 'MISSING_CAPTURE_DATE',
      severity: 'HIGH',
      message: 'No capture date found in EXIF data. The photo may have been edited or metadata was stripped.',
    });
  } else {
    // Check for future date
    const now = new Date();
    if (exifData.capturedAt > now) {
      warnings.push({
        type: 'FUTURE_DATE',
        severity: 'HIGH',
        message: `Capture date (${exifData.capturedAt.toISOString()}) is in the future. This suggests metadata manipulation.`,
      });
    }
    
    // Check date range if expected
    if (context.expectedDateRange) {
      const { start, end } = context.expectedDateRange;
      if (exifData.capturedAt < start || exifData.capturedAt > end) {
        warnings.push({
          type: 'DATE_MISMATCH',
          severity: 'HIGH',
          message: `Capture date (${exifData.capturedAt.toLocaleDateString()}) is outside the expected range (${start.toLocaleDateString()} - ${end.toLocaleDateString()}).`,
        });
      }
    }
  }
  
  // Check for software modification
  if (exifData.software) {
    const editingSoftware = [
      'photoshop', 'lightroom', 'gimp', 'snapseed', 'vsco', 
      'pixlr', 'canva', 'affinity', 'skylum', 'capture one',
      'adobe', 'corel', 'acdsee', 'photoeditor'
    ];
    
    const softwareLower = exifData.software.toLowerCase();
    const isEditing = editingSoftware.some(sw => softwareLower.includes(sw));
    
    if (isEditing) {
      warnings.push({
        type: 'SOFTWARE_MODIFIED',
        severity: 'MEDIUM',
        message: `Photo was processed with editing software: ${exifData.software}`,
      });
    }
  }
  
  // Check for location mismatch
  if (context.expectedLocation && exifData.gpsLatitude && exifData.gpsLongitude) {
    const distance = calculateDistance(
      context.expectedLocation.lat,
      context.expectedLocation.lng,
      exifData.gpsLatitude,
      exifData.gpsLongitude
    );
    
    if (distance > context.expectedLocation.radiusMeters) {
      warnings.push({
        type: 'LOCATION_MISMATCH',
        severity: 'HIGH',
        message: `Photo was taken ${(distance / 1000).toFixed(2)} km from expected location (within ${context.expectedLocation.radiusMeters}m required).`,
      });
    }
  }
  
  // Check for device mismatch
  if (context.allowedDevices && context.allowedDevices.length > 0) {
    const deviceStr = [exifData.deviceMake, exifData.deviceModel]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    
    if (deviceStr) {
      const isAllowed = context.allowedDevices.some(allowed => 
        deviceStr.includes(allowed.toLowerCase())
      );
      
      if (!isAllowed) {
        warnings.push({
          type: 'DEVICE_MISMATCH',
          severity: 'LOW',
          message: `Device (${exifData.deviceMake || 'Unknown'} ${exifData.deviceModel || 'Unknown'}) is not in the allowed devices list.`,
        });
      }
    }
  }
  
  // Check for metadata stripped (very few EXIF fields present)
  const presentFields = Object.values(exifData).filter(v => v !== undefined).length;
  if (presentFields < 3) {
    warnings.push({
      type: 'METADATA_STRIPPED',
      severity: 'HIGH',
      message: 'Most EXIF metadata is missing. The photo may have been processed or metadata was intentionally removed.',
    });
  }
  
  // Check for suspicious edit patterns
  if (exifData.capturedAt && exifData.modifiedAt) {
    const timeDiff = exifData.modifiedAt.getTime() - exifData.capturedAt.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    if (daysDiff > 30) {
      warnings.push({
        type: 'SUSPICIOUS_EDIT',
        severity: 'MEDIUM',
        message: `Photo was modified ${Math.round(daysDiff)} days after capture. This may indicate post-processing.`,
      });
    }
  }
  
  // Calculate trust score
  const trustScore = calculateTrustScore(exifData, warnings);
  
  // Determine overall validity
  const isValid = !warnings.some(w => w.severity === 'HIGH');
  
  return {
    isValid,
    warnings,
    extracted: exifData,
    trustScore,
  };
}

/**
 * Calculate trust score from EXIF data and warnings
 */
export function calculateTrustScore(exifData: ExifData, warnings: ExifWarning[]): number {
  let score = 100;
  
  // Apply penalties for warnings
  for (const warning of warnings) {
    score -= TRUST_SCORE_PENALTIES[warning.type];
  }
  
  // Penalty for missing GPS data
  if (!exifData.gpsLatitude || !exifData.gpsLongitude) {
    score -= NO_GPS_PENALTY;
  }
  
  // Bonus for rich metadata
  const presentFields = Object.values(exifData).filter(v => v !== undefined).length;
  if (presentFields >= 8) {
    score += 5; // Bonus for rich metadata
  }
  
  // Ensure score is within bounds
  return Math.max(0, Math.min(100, score));
}

/**
 * Calculate distance between two GPS coordinates using Haversine formula
 */
function calculateDistance(
  lat1: number, 
  lon1: number, 
  lat2: number, 
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  return R * c;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Format EXIF data for display
 */
export function formatExifData(exifData: ExifData): Record<string, string> {
  const formatted: Record<string, string> = {};
  
  if (exifData.capturedAt) {
    formatted['Captured At'] = exifData.capturedAt.toLocaleString();
  }
  if (exifData.deviceMake || exifData.deviceModel) {
    formatted['Device'] = `${exifData.deviceMake || ''} ${exifData.deviceModel || ''}`.trim();
  }
  if (exifData.software) {
    formatted['Software'] = exifData.software;
  }
  if (exifData.gpsLatitude !== undefined) {
    formatted['Latitude'] = exifData.gpsLatitude.toFixed(6);
  }
  if (exifData.gpsLongitude !== undefined) {
    formatted['Longitude'] = exifData.gpsLongitude.toFixed(6);
  }
  if (exifData.altitude !== undefined) {
    formatted['Altitude'] = `${exifData.altitude.toFixed(1)} m`;
  }
  if (exifData.imageWidth && exifData.imageHeight) {
    formatted['Image Size'] = `${exifData.imageWidth} x ${exifData.imageHeight}`;
  }
  if (exifData.orientation) {
    formatted['Orientation'] = getOrientationName(exifData.orientation);
  }
  if (exifData.exposureTime !== undefined) {
    formatted['Exposure'] = exifData.exposureTime < 1 
      ? `1/${Math.round(1 / exifData.exposureTime)}s`
      : `${exifData.exposureTime}s`;
  }
  if (exifData.fNumber !== undefined) {
    formatted['Aperture'] = `f/${exifData.fNumber.toFixed(1)}`;
  }
  if (exifData.iso !== undefined) {
    formatted['ISO'] = exifData.iso.toString();
  }
  if (exifData.focalLength !== undefined) {
    formatted['Focal Length'] = `${exifData.focalLength.toFixed(1)} mm`;
  }
  if (exifData.modifiedAt) {
    formatted['Modified At'] = exifData.modifiedAt.toLocaleString();
  }
  
  return formatted;
}

/**
 * Get orientation name from EXIF orientation value
 */
function getOrientationName(orientation: number): string {
  const orientations: Record<number, string> = {
    1: 'Normal',
    2: 'Horizontal Flip',
    3: 'Rotate 180°',
    4: 'Vertical Flip',
    5: 'Transpose',
    6: 'Rotate 90° CW',
    7: 'Transverse',
    8: 'Rotate 270° CW',
  };
  return orientations[orientation] || 'Unknown';
}

/**
 * Check if buffer is a supported image format
 */
export function isSupportedImageFormat(buffer: Buffer): boolean {
  // JPEG
  if (buffer[0] === 0xFF && buffer[1] === 0xD8) {
    return true;
  }
  
  // PNG (limited EXIF support)
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return true;
  }
  
  return false;
}

/**
 * Get trust score badge color
 */
export function getTrustScoreColor(score: number): string {
  if (score >= 80) return 'emerald';
  if (score >= 60) return 'amber';
  if (score >= 40) return 'orange';
  return 'red';
}

/**
 * Get trust score label
 */
export function getTrustScoreLabel(score: number): string {
  if (score >= 80) return 'High Trust';
  if (score >= 60) return 'Moderate Trust';
  if (score >= 40) return 'Low Trust';
  return 'Untrusted';
}
