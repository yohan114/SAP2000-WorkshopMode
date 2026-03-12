-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT,
    "department" TEXT,
    "costCentre" TEXT,
    "contractType" TEXT,
    "riskLevel" TEXT NOT NULL DEFAULT 'LOW',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserRole" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "workshopId" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserRole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrivilegeDefinition" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrivilegeDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePrivilegeSet" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "privilegeId" TEXT NOT NULL,
    "isGranted" BOOLEAN NOT NULL DEFAULT true,
    "maxAmount" DECIMAL(65,30),
    "workshopScope" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePrivilegeSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPrivilegeOverride" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "privilegeId" TEXT NOT NULL,
    "isGranted" BOOLEAN NOT NULL,
    "reason" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "grantedBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPrivilegeOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "refreshToken" TEXT,
    "deviceFingerprint" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isValid" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceRegistry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "deviceFingerprint" TEXT NOT NULL,
    "deviceName" TEXT,
    "deviceType" TEXT,
    "platform" TEXT,
    "lastUsedAt" TIMESTAMP(3),
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "blockedAt" TIMESTAMP(3),
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeviceRegistry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentCatId" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Asset" (
    "id" TEXT NOT NULL,
    "assetNumber" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "make" TEXT,
    "model" TEXT,
    "serialNumber" TEXT,
    "yearOfManufacture" INTEGER,
    "acquisitionDate" TIMESTAMP(3),
    "acquisitionCost" DECIMAL(65,30),
    "currentLocation" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPERATIONAL',
    "criticality" TEXT NOT NULL DEFAULT 'MEDIUM',
    "warrantyExpiry" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetQrCode" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "qrCode" TEXT NOT NULL,
    "qrHash" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "printedAt" TIMESTAMP(3),
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetQrCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetMeter" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "meterType" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "currentValue" DECIMAL(65,30) NOT NULL,
    "lastReadingAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetMeter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MeterReading" (
    "id" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "readingValue" DECIMAL(65,30) NOT NULL,
    "readingSource" TEXT,
    "overrideReason" TEXT,
    "overrideBy" TEXT,
    "readingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MeterReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssetSpecificity" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "specificity" TEXT NOT NULL DEFAULT 'GENERAL',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AssetSpecificity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCard" (
    "id" TEXT NOT NULL,
    "jobCardNumber" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "faultDescription" TEXT NOT NULL,
    "diagnosisNotes" TEXT,
    "workPerformed" TEXT,
    "estimatedCost" DECIMAL(65,30),
    "estimatedDuration" INTEGER,
    "actualCost" DECIMAL(65,30) DEFAULT 0,
    "actualDuration" INTEGER,
    "scheduledStart" TIMESTAMP(3),
    "scheduledEnd" TIMESTAMP(3),
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "meterReadingStart" DECIMAL(65,30),
    "meterReadingEnd" DECIMAL(65,30),
    "ecoNumber" TEXT,
    "accidentReportRef" TEXT,
    "warrantyClaimRef" TEXT,
    "closedAt" TIMESTAMP(3),
    "closedBy" TEXT,
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledBy" TEXT,
    "reopenReason" TEXT,
    "reopenedAt" TIMESTAMP(3),
    "reopenedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "JobCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JcTask" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "taskNumber" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "isComplete" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "requiresPhoto" BOOLEAN NOT NULL DEFAULT false,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JcTask_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JcTaskPhoto" (
    "id" TEXT NOT NULL,
    "taskId" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "exifData" TEXT,
    "capturedAt" TIMESTAMP(3),
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JcTaskPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JcStateTransition" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    "transitionType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "comments" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JcStateTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JcCostLine" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "costType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "sourceRef" TEXT,
    "sourceType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JcCostLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JcDocument" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "documentType" TEXT NOT NULL,
    "filePath" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "description" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploadedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JcDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JcTechnicianAssignment" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "technicianId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'TECHNICIAN',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assignedBy" TEXT,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JcTechnicianAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JobCardApproval" (
    "id" TEXT NOT NULL,
    "jobCardId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approvalLevel" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobCardApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialRequest" (
    "id" TEXT NOT NULL,
    "mrNumber" TEXT NOT NULL,
    "jobCardId" TEXT,
    "requestorId" TEXT NOT NULL,
    "requestType" TEXT NOT NULL DEFAULT 'JC_LINKED',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "requiredBy" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "rejectionReason" TEXT,
    "fulfilledAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "MaterialRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MrLine" (
    "id" TEXT NOT NULL,
    "mrId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemId" TEXT NOT NULL,
    "requestedQty" DECIMAL(65,30) NOT NULL,
    "approvedQty" DECIMAL(65,30),
    "issuedQty" DECIMAL(65,30) DEFAULT 0,
    "unitCost" DECIMAL(65,30) DEFAULT 0,
    "wacAtApproval" DECIMAL(65,30),
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MrLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MrStateTransition" (
    "id" TEXT NOT NULL,
    "mrId" TEXT NOT NULL,
    "fromState" TEXT NOT NULL,
    "toState" TEXT NOT NULL,
    "transitionType" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MrStateTransition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MrApprovalHistory" (
    "id" TEXT NOT NULL,
    "mrId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approvalLevel" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MrApprovalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaterialIssue" (
    "id" TEXT NOT NULL,
    "miNumber" TEXT NOT NULL,
    "mrId" TEXT,
    "storeId" TEXT NOT NULL,
    "issueType" TEXT NOT NULL DEFAULT 'STANDARD',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issuedToId" TEXT NOT NULL,
    "jobCardId" TEXT,
    "counterNumber" INTEGER,
    "counterLockedAt" TIMESTAMP(3),
    "issuedBy" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "verificationStatus" TEXT,
    "disputeReason" TEXT,
    "totalValue" DECIMAL(65,30) DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "MaterialIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiLine" (
    "id" TEXT NOT NULL,
    "miId" TEXT NOT NULL,
    "mrLineId" TEXT,
    "itemId" TEXT NOT NULL,
    "issuedQty" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "serialNumber" TEXT,
    "batchNumber" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiReturn" (
    "id" TEXT NOT NULL,
    "returnNumber" TEXT NOT NULL,
    "miId" TEXT NOT NULL,
    "returnType" TEXT NOT NULL DEFAULT 'GOOD',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "returnedById" TEXT NOT NULL,
    "approvedById" TEXT,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MiReturn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MiReturnLine" (
    "id" TEXT NOT NULL,
    "returnId" TEXT NOT NULL,
    "miLineId" TEXT NOT NULL,
    "returnedQty" DECIMAL(65,30) NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MiReturnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreCounterLock" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "counterNumber" INTEGER NOT NULL,
    "lockedBy" TEXT NOT NULL,
    "lockedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "releasedAt" TIMESTAMP(3),
    "releasedBy" TEXT,
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoreCounterLock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ToolLoanTracking" (
    "id" TEXT NOT NULL,
    "toolId" TEXT NOT NULL,
    "jobCardId" TEXT,
    "issuedToId" TEXT NOT NULL,
    "loanStatus" TEXT NOT NULL DEFAULT 'ACTIVE',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "returnedAt" TIMESTAMP(3),
    "returnedCondition" TEXT,
    "overdueAlerts" INTEGER NOT NULL DEFAULT 0,
    "lastAlertAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ToolLoanTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Store" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "storeType" TEXT NOT NULL DEFAULT 'MAIN',
    "location" TEXT,
    "managerId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "categoryId" TEXT,
    "unitOfMeasure" TEXT NOT NULL,
    "itemClass" TEXT NOT NULL DEFAULT 'CONSUMABLE',
    "minimumStock" DECIMAL(65,30) DEFAULT 0,
    "maximumStock" DECIMAL(65,30),
    "reorderLevel" DECIMAL(65,30),
    "reorderQuantity" DECIMAL(65,30),
    "maxIssueLimit" DECIMAL(65,30),
    "isTool" BOOLEAN NOT NULL DEFAULT false,
    "isCritical" BOOLEAN NOT NULL DEFAULT false,
    "forceHoChannel" BOOLEAN NOT NULL DEFAULT false,
    "highValueThreshold" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemCategory" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "parentCatId" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ItemCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StoreStock" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "availableQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "reservedQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "quarantineQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "wac" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "lastMovementAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoreStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockReservation" (
    "id" TEXT NOT NULL,
    "mrLineId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "reservedQty" DECIMAL(65,30) NOT NULL,
    "wacAtReservation" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3),
    "releasedAt" TIMESTAMP(3),
    "releaseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockReservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockTransaction" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "totalValue" DECIMAL(65,30) NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "miId" TEXT,
    "returnId" TEXT,
    "performedBy" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrnHeader" (
    "id" TEXT NOT NULL,
    "grnNumber" TEXT NOT NULL,
    "poId" TEXT,
    "supplierId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "deliveryNoteNo" TEXT,
    "deliveryDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "createdBy" TEXT NOT NULL,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "postedBy" TEXT,
    "totalValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrnHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GrnLine" (
    "id" TEXT NOT NULL,
    "grnId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "receivedQty" DECIMAL(65,30) NOT NULL,
    "acceptedQty" DECIMAL(65,30) NOT NULL,
    "rejectedQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "unitCost" DECIMAL(65,30) NOT NULL,
    "totalCost" DECIMAL(65,30) NOT NULL,
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GrnLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseRequest" (
    "id" TEXT NOT NULL,
    "prNumber" TEXT NOT NULL,
    "requestorId" TEXT NOT NULL,
    "department" TEXT,
    "requestType" TEXT NOT NULL DEFAULT 'STANDARD',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "procurementChannel" TEXT,
    "estimatedValue" DECIMAL(65,30),
    "approvedValue" DECIMAL(65,30),
    "requiredBy" TIMESTAMP(3),
    "justification" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "PurchaseRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrLine" (
    "id" TEXT NOT NULL,
    "prId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitOfMeasure" TEXT,
    "estimatedCost" DECIMAL(65,30),
    "totalEstCost" DECIMAL(65,30),
    "assetId" TEXT,
    "specificity" TEXT DEFAULT 'GENERAL',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrApproval" (
    "id" TEXT NOT NULL,
    "prId" TEXT NOT NULL,
    "approverId" TEXT NOT NULL,
    "approvalLevel" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PrApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqHeader" (
    "id" TEXT NOT NULL,
    "rfqNumber" TEXT NOT NULL,
    "prId" TEXT,
    "procurementOfficer" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "issueDate" TIMESTAMP(3),
    "closingDate" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RfqHeader_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqLine" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "prLineId" TEXT,
    "itemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitOfMeasure" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RfqSupplier" (
    "id" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3),
    "respondedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'INVITED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RfqSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quotation" (
    "id" TEXT NOT NULL,
    "quotationNumber" TEXT NOT NULL,
    "rfqId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "quotationDate" TIMESTAMP(3) NOT NULL,
    "validUntil" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalValue" DECIMAL(65,30) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "terms" TEXT,
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Quotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationLine" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "itemId" TEXT,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "totalPrice" DECIMAL(65,30) NOT NULL,
    "leadTime" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuotationEvaluation" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "evaluatorId" TEXT NOT NULL,
    "priceScore" DECIMAL(65,30),
    "qualityScore" DECIMAL(65,30),
    "deliveryScore" DECIMAL(65,30),
    "totalScore" DECIMAL(65,30),
    "comments" TEXT,
    "recommendation" TEXT,
    "evaluatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseOrder" (
    "id" TEXT NOT NULL,
    "poNumber" TEXT NOT NULL,
    "prId" TEXT,
    "quotationId" TEXT,
    "supplierId" TEXT NOT NULL,
    "procurementChannel" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "orderDate" TIMESTAMP(3),
    "expectedDeliveryDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalValue" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "terms" TEXT,
    "notes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "issuedAt" TIMESTAMP(3),
    "acknowledgedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" TEXT,
    "updatedBy" TEXT,

    CONSTRAINT "PurchaseOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoLine" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "itemId" TEXT,
    "description" TEXT NOT NULL,
    "orderedQty" DECIMAL(65,30) NOT NULL,
    "receivedQty" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "unitPrice" DECIMAL(65,30) NOT NULL,
    "totalPrice" DECIMAL(65,30) NOT NULL,
    "leadTime" INTEGER,
    "notes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PoLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PoAmendment" (
    "id" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "amendmentNumber" INTEGER NOT NULL,
    "amendmentType" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PoAmendment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierInvoice" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "poId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "invoiceDate" TIMESTAMP(3) NOT NULL,
    "dueDate" TIMESTAMP(3),
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "totalValue" DECIMAL(65,30) NOT NULL,
    "taxAmount" DECIMAL(65,30),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "matchStatus" TEXT,
    "varianceNotes" TEXT,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "paymentRef" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "invoicedQty" DECIMAL(65,30) NOT NULL,
    "invoicedPrice" DECIMAL(65,30) NOT NULL,
    "invoicedTotal" DECIMAL(65,30) NOT NULL,
    "matchQtyVariance" DECIMAL(65,30),
    "matchPriceVariance" DECIMAL(65,30),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReturnToSupplier" (
    "id" TEXT NOT NULL,
    "rtsNumber" TEXT NOT NULL,
    "poId" TEXT,
    "grnId" TEXT,
    "supplierId" TEXT NOT NULL,
    "returnType" TEXT NOT NULL DEFAULT 'REJECTION',
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "totalValue" DECIMAL(65,30),
    "creditNoteNumber" TEXT,
    "creditNoteValue" DECIMAL(65,30),
    "creditNoteReceivedAt" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReturnToSupplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkshopPurchaseAuthority" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "workshopName" TEXT NOT NULL,
    "lpaLimit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "emergencyLpaLimit" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "monthlyCap" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentMonthSpend" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "currentMonth" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkshopPurchaseAuthority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LpaChangeHistory" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "previousLimit" DECIMAL(65,30) NOT NULL,
    "newLimit" DECIMAL(65,30) NOT NULL,
    "changeReason" TEXT NOT NULL,
    "changedBy" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LpaChangeHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrChannelDecision" (
    "id" TEXT NOT NULL,
    "prId" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "decisionReason" TEXT,
    "ruleMatched" TEXT,
    "overrideBy" TEXT,
    "overrideReason" TEXT,
    "decidedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrChannelDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrSplitRecord" (
    "id" TEXT NOT NULL,
    "originalPrId" TEXT NOT NULL,
    "localPrId" TEXT,
    "hoPrId" TEXT,
    "splitReason" TEXT,
    "localValue" DECIMAL(65,30),
    "hoValue" DECIMAL(65,30),
    "splitBy" TEXT NOT NULL,
    "splitAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PrSplitRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChannelOverrideLog" (
    "id" TEXT NOT NULL,
    "prId" TEXT,
    "poId" TEXT,
    "overrideType" TEXT NOT NULL,
    "previousChannel" TEXT,
    "newChannel" TEXT,
    "previousLimit" DECIMAL(65,30),
    "newLimit" DECIMAL(65,30),
    "reason" TEXT NOT NULL,
    "overriddenBy" TEXT NOT NULL,
    "overrideAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "hoNotified" BOOLEAN NOT NULL DEFAULT false,
    "hoNotifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChannelOverrideLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LocalApprovedVendorList" (
    "id" TEXT NOT NULL,
    "workshopId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "approvedCategories" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "validTo" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "approvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LocalApprovedVendorList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "supplierCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "taxId" TEXT,
    "paymentTerms" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "performanceRating" DECIMAL(65,30),
    "isHoApproved" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SupplierContact" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelTank" (
    "id" TEXT NOT NULL,
    "tankNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fuelType" TEXT NOT NULL,
    "capacity" DECIMAL(65,30) NOT NULL,
    "currentLevel" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "location" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelTank_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelIssue" (
    "id" TEXT NOT NULL,
    "issueNumber" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "assetId" TEXT,
    "jobCardId" TEXT,
    "issuedToId" TEXT NOT NULL,
    "quantity" DECIMAL(65,30) NOT NULL,
    "previousMeterReading" DECIMAL(65,30),
    "currentMeterReading" DECIMAL(65,30),
    "consumptionNorm" DECIMAL(65,30),
    "isAbnormal" BOOLEAN NOT NULL DEFAULT false,
    "abnormalReason" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelReading" (
    "id" TEXT NOT NULL,
    "tankId" TEXT NOT NULL,
    "readingValue" DECIMAL(65,30) NOT NULL,
    "readingAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "readingBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelReading_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbnormalDetection" (
    "id" TEXT NOT NULL,
    "detectionType" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'MEDIUM',
    "description" TEXT NOT NULL,
    "detectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbnormalDetection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalJob" (
    "id" TEXT NOT NULL,
    "jobNumber" TEXT NOT NULL,
    "jobCardId" TEXT,
    "assetId" TEXT,
    "subcontractorId" TEXT,
    "jobType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "estimatedCost" DECIMAL(65,30),
    "actualCost" DECIMAL(65,30),
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "invoiceRef" TEXT,
    "warrantyExpiry" TIMESTAMP(3),
    "notes" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalQuotation" (
    "id" TEXT NOT NULL,
    "externalJobId" TEXT NOT NULL,
    "quotationNumber" TEXT,
    "amount" DECIMAL(65,30) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "validUntil" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalQuotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExtJobCost" (
    "id" TEXT NOT NULL,
    "externalJobId" TEXT NOT NULL,
    "costType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DECIMAL(65,30) NOT NULL,
    "invoiceRef" TEXT,
    "costDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExtJobCost_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subcontractor" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "contactPerson" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "specialization" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "rating" DECIMAL(65,30),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subcontractor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "designation" TEXT,
    "skillLevel" TEXT,
    "hourlyRate" DECIMAL(65,30),
    "overtimeRate" DECIMAL(65,30),
    "hireDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TimeLog" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "jobCardId" TEXT,
    "logDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalMinutes" INTEGER,
    "hourlyRate" DECIMAL(65,30),
    "totalCost" DECIMAL(65,30),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Training" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "validityPeriod" INTEGER,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TrainingCompletion" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "score" DECIMAL(65,30),
    "certificateRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingCompletion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Skill" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'GENERAL',
    "level" INTEGER NOT NULL DEFAULT 1,
    "description" TEXT,
    "expires" BOOLEAN NOT NULL DEFAULT false,
    "validityDays" INTEGER,
    "certifyingBody" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Skill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicianSkill" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "awardedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" TIMESTAMP(3),
    "certificateUrl" TEXT,
    "trainingRef" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianSkill_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmTemplate" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetCategory" TEXT NOT NULL,
    "description" TEXT,
    "estimatedHours" DECIMAL(65,30),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmChecklistItem" (
    "id" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL DEFAULT 1,
    "itemType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "partRequired" BOOLEAN NOT NULL DEFAULT false,
    "partCode" TEXT,
    "quantity" DECIMAL(65,30),
    "unitOfMeasure" TEXT,
    "isMandatory" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmChecklistItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmSchedule" (
    "id" TEXT NOT NULL,
    "scheduleNumber" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "templateId" TEXT,
    "pmType" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "calendarInterval" INTEGER,
    "kmInterval" INTEGER,
    "hourInterval" DECIMAL(65,30),
    "leadDays" INTEGER NOT NULL DEFAULT 7,
    "lastExecutedAt" TIMESTAMP(3),
    "lastOdometer" DECIMAL(65,30),
    "lastHours" DECIMAL(65,30),
    "nextExecutionAt" TIMESTAMP(3),
    "nextDueKm" DECIMAL(65,30),
    "nextDueHours" DECIMAL(65,30),
    "estimatedDuration" INTEGER,
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "pauseReason" TEXT,
    "pausedAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmExecution" (
    "id" TEXT NOT NULL,
    "executionNumber" TEXT NOT NULL,
    "scheduleId" TEXT NOT NULL,
    "jobCardId" TEXT,
    "scheduledDate" TIMESTAMP(3),
    "executionDate" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "odometerReading" DECIMAL(65,30),
    "hourReading" DECIMAL(65,30),
    "downtimeMinutes" INTEGER,
    "technicianNotes" TEXT,
    "supervisorNotes" TEXT,
    "failItemsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PmExecutionItem" (
    "id" TEXT NOT NULL,
    "executionId" TEXT NOT NULL,
    "checklistItemId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "measuredValue" TEXT,
    "notes" TEXT,
    "completedAt" TIMESTAMP(3),
    "completedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PmExecutionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DowntimeLog" (
    "id" TEXT NOT NULL,
    "assetId" TEXT NOT NULL,
    "jobCardId" TEXT,
    "downtimeType" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "totalMinutes" INTEGER,
    "reason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DowntimeLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalWorkflow" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "workflowType" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalWorkflow_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStepConfig" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "stepName" TEXT NOT NULL,
    "approverRole" TEXT,
    "approverId" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT true,
    "slaHours" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ApprovalStepConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalRequest" (
    "id" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "referenceType" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApprovalStep" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "stepNumber" INTEGER NOT NULL,
    "approverId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "comments" TEXT,
    "slaDueAt" TIMESTAMP(3),
    "actedAt" TIMESTAMP(3),
    "delegatedTo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ApprovalStep_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaConfig" (
    "id" TEXT NOT NULL,
    "slaType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "responseHours" INTEGER,
    "completionHours" INTEGER,
    "escalationLevels" INTEGER,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SlaTracking" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "slaType" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetAt" TIMESTAMP(3) NOT NULL,
    "respondedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "breachReason" TEXT,
    "waiverReason" TEXT,
    "waiverApprovedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlaTracking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "actorId" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "hash" TEXT,
    "previousHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrityCheck" (
    "id" TEXT NOT NULL,
    "checkType" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "expectedValue" TEXT,
    "actualValue" TEXT,
    "variance" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolutionNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntegrityCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiSnapshot" (
    "id" TEXT NOT NULL,
    "kpiCode" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "value" DECIMAL(65,30) NOT NULL,
    "target" DECIMAL(65,30),
    "unit" TEXT,
    "snapshotDate" TIMESTAMP(3) NOT NULL,
    "period" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "KpiSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "KpiThresholdConfig" (
    "id" TEXT NOT NULL,
    "kpiCode" TEXT NOT NULL,
    "kpiName" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "amberThreshold" DECIMAL(65,30) NOT NULL,
    "redThreshold" DECIMAL(65,30) NOT NULL,
    "higherIsWorse" BOOLEAN NOT NULL DEFAULT false,
    "unit" TEXT,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KpiThresholdConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportSchedule" (
    "id" TEXT NOT NULL,
    "reportName" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "recipients" TEXT,
    "format" TEXT NOT NULL DEFAULT 'PDF',
    "lastRunAt" TIMESTAMP(3),
    "nextRunAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BudgetLine" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "department" TEXT,
    "fiscalYear" INTEGER NOT NULL,
    "allocatedAmount" DECIMAL(65,30) NOT NULL,
    "committedAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "spentAmount" DECIMAL(65,30) NOT NULL DEFAULT 0,
    "availableAmount" DECIMAL(65,30) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BudgetLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_employeeId_idx" ON "User"("employeeId");

-- CreateIndex
CREATE INDEX "User_isActive_idx" ON "User"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Role_code_key" ON "Role"("code");

-- CreateIndex
CREATE INDEX "Role_code_idx" ON "Role"("code");

-- CreateIndex
CREATE INDEX "UserRole_userId_idx" ON "UserRole"("userId");

-- CreateIndex
CREATE INDEX "UserRole_roleId_idx" ON "UserRole"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "UserRole_userId_roleId_key" ON "UserRole"("userId", "roleId");

-- CreateIndex
CREATE UNIQUE INDEX "PrivilegeDefinition_code_key" ON "PrivilegeDefinition"("code");

-- CreateIndex
CREATE INDEX "PrivilegeDefinition_code_idx" ON "PrivilegeDefinition"("code");

-- CreateIndex
CREATE INDEX "PrivilegeDefinition_category_idx" ON "PrivilegeDefinition"("category");

-- CreateIndex
CREATE INDEX "RolePrivilegeSet_roleId_idx" ON "RolePrivilegeSet"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePrivilegeSet_roleId_privilegeId_key" ON "RolePrivilegeSet"("roleId", "privilegeId");

-- CreateIndex
CREATE INDEX "UserPrivilegeOverride_userId_idx" ON "UserPrivilegeOverride"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE INDEX "UserSession_userId_idx" ON "UserSession"("userId");

-- CreateIndex
CREATE INDEX "UserSession_tokenHash_idx" ON "UserSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceRegistry_deviceFingerprint_key" ON "DeviceRegistry"("deviceFingerprint");

-- CreateIndex
CREATE INDEX "DeviceRegistry_userId_idx" ON "DeviceRegistry"("userId");

-- CreateIndex
CREATE INDEX "DeviceRegistry_deviceFingerprint_idx" ON "DeviceRegistry"("deviceFingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "AssetCategory_code_key" ON "AssetCategory"("code");

-- CreateIndex
CREATE INDEX "AssetCategory_code_idx" ON "AssetCategory"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Asset_assetNumber_key" ON "Asset"("assetNumber");

-- CreateIndex
CREATE INDEX "Asset_assetNumber_idx" ON "Asset"("assetNumber");

-- CreateIndex
CREATE INDEX "Asset_categoryId_idx" ON "Asset"("categoryId");

-- CreateIndex
CREATE INDEX "Asset_status_idx" ON "Asset"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AssetQrCode_qrCode_key" ON "AssetQrCode"("qrCode");

-- CreateIndex
CREATE UNIQUE INDEX "AssetQrCode_qrHash_key" ON "AssetQrCode"("qrHash");

-- CreateIndex
CREATE INDEX "AssetQrCode_assetId_idx" ON "AssetQrCode"("assetId");

-- CreateIndex
CREATE INDEX "AssetQrCode_qrCode_idx" ON "AssetQrCode"("qrCode");

-- CreateIndex
CREATE INDEX "AssetMeter_assetId_idx" ON "AssetMeter"("assetId");

-- CreateIndex
CREATE INDEX "MeterReading_meterId_idx" ON "MeterReading"("meterId");

-- CreateIndex
CREATE INDEX "MeterReading_readingAt_idx" ON "MeterReading"("readingAt");

-- CreateIndex
CREATE UNIQUE INDEX "AssetSpecificity_assetId_itemId_key" ON "AssetSpecificity"("assetId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "JobCard_jobCardNumber_key" ON "JobCard"("jobCardNumber");

-- CreateIndex
CREATE INDEX "JobCard_assetId_idx" ON "JobCard"("assetId");

-- CreateIndex
CREATE INDEX "JobCard_jobCardNumber_idx" ON "JobCard"("jobCardNumber");

-- CreateIndex
CREATE INDEX "JobCard_status_idx" ON "JobCard"("status");

-- CreateIndex
CREATE INDEX "JobCard_priority_idx" ON "JobCard"("priority");

-- CreateIndex
CREATE INDEX "JobCard_createdAt_idx" ON "JobCard"("createdAt");

-- CreateIndex
CREATE INDEX "JcTask_jobCardId_idx" ON "JcTask"("jobCardId");

-- CreateIndex
CREATE UNIQUE INDEX "JcTask_jobCardId_taskNumber_key" ON "JcTask"("jobCardId", "taskNumber");

-- CreateIndex
CREATE INDEX "JcTaskPhoto_taskId_idx" ON "JcTaskPhoto"("taskId");

-- CreateIndex
CREATE INDEX "JcStateTransition_jobCardId_idx" ON "JcStateTransition"("jobCardId");

-- CreateIndex
CREATE INDEX "JcStateTransition_createdAt_idx" ON "JcStateTransition"("createdAt");

-- CreateIndex
CREATE INDEX "JcCostLine_jobCardId_idx" ON "JcCostLine"("jobCardId");

-- CreateIndex
CREATE INDEX "JcCostLine_costType_idx" ON "JcCostLine"("costType");

-- CreateIndex
CREATE INDEX "JcDocument_jobCardId_idx" ON "JcDocument"("jobCardId");

-- CreateIndex
CREATE INDEX "JcDocument_documentType_idx" ON "JcDocument"("documentType");

-- CreateIndex
CREATE INDEX "JcTechnicianAssignment_jobCardId_idx" ON "JcTechnicianAssignment"("jobCardId");

-- CreateIndex
CREATE INDEX "JcTechnicianAssignment_technicianId_idx" ON "JcTechnicianAssignment"("technicianId");

-- CreateIndex
CREATE UNIQUE INDEX "JcTechnicianAssignment_jobCardId_technicianId_key" ON "JcTechnicianAssignment"("jobCardId", "technicianId");

-- CreateIndex
CREATE INDEX "JobCardApproval_jobCardId_idx" ON "JobCardApproval"("jobCardId");

-- CreateIndex
CREATE INDEX "JobCardApproval_approverId_idx" ON "JobCardApproval"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialRequest_mrNumber_key" ON "MaterialRequest"("mrNumber");

-- CreateIndex
CREATE INDEX "MaterialRequest_mrNumber_idx" ON "MaterialRequest"("mrNumber");

-- CreateIndex
CREATE INDEX "MaterialRequest_jobCardId_idx" ON "MaterialRequest"("jobCardId");

-- CreateIndex
CREATE INDEX "MaterialRequest_requestorId_idx" ON "MaterialRequest"("requestorId");

-- CreateIndex
CREATE INDEX "MaterialRequest_status_idx" ON "MaterialRequest"("status");

-- CreateIndex
CREATE INDEX "MrLine_mrId_idx" ON "MrLine"("mrId");

-- CreateIndex
CREATE INDEX "MrLine_itemId_idx" ON "MrLine"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "MrLine_mrId_lineNumber_key" ON "MrLine"("mrId", "lineNumber");

-- CreateIndex
CREATE INDEX "MrStateTransition_mrId_idx" ON "MrStateTransition"("mrId");

-- CreateIndex
CREATE INDEX "MrApprovalHistory_mrId_idx" ON "MrApprovalHistory"("mrId");

-- CreateIndex
CREATE INDEX "MrApprovalHistory_approverId_idx" ON "MrApprovalHistory"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "MaterialIssue_miNumber_key" ON "MaterialIssue"("miNumber");

-- CreateIndex
CREATE INDEX "MaterialIssue_miNumber_idx" ON "MaterialIssue"("miNumber");

-- CreateIndex
CREATE INDEX "MaterialIssue_mrId_idx" ON "MaterialIssue"("mrId");

-- CreateIndex
CREATE INDEX "MaterialIssue_storeId_idx" ON "MaterialIssue"("storeId");

-- CreateIndex
CREATE INDEX "MaterialIssue_issuedToId_idx" ON "MaterialIssue"("issuedToId");

-- CreateIndex
CREATE INDEX "MaterialIssue_status_idx" ON "MaterialIssue"("status");

-- CreateIndex
CREATE INDEX "MiLine_miId_idx" ON "MiLine"("miId");

-- CreateIndex
CREATE INDEX "MiLine_itemId_idx" ON "MiLine"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "MiReturn_returnNumber_key" ON "MiReturn"("returnNumber");

-- CreateIndex
CREATE INDEX "MiReturn_miId_idx" ON "MiReturn"("miId");

-- CreateIndex
CREATE INDEX "MiReturn_returnNumber_idx" ON "MiReturn"("returnNumber");

-- CreateIndex
CREATE INDEX "MiReturnLine_returnId_idx" ON "MiReturnLine"("returnId");

-- CreateIndex
CREATE INDEX "MiReturnLine_miLineId_idx" ON "MiReturnLine"("miLineId");

-- CreateIndex
CREATE INDEX "StoreCounterLock_storeId_idx" ON "StoreCounterLock"("storeId");

-- CreateIndex
CREATE INDEX "StoreCounterLock_lockedBy_idx" ON "StoreCounterLock"("lockedBy");

-- CreateIndex
CREATE INDEX "StoreCounterLock_expiresAt_idx" ON "StoreCounterLock"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "StoreCounterLock_storeId_counterNumber_isActive_key" ON "StoreCounterLock"("storeId", "counterNumber", "isActive");

-- CreateIndex
CREATE INDEX "ToolLoanTracking_toolId_idx" ON "ToolLoanTracking"("toolId");

-- CreateIndex
CREATE INDEX "ToolLoanTracking_issuedToId_idx" ON "ToolLoanTracking"("issuedToId");

-- CreateIndex
CREATE INDEX "ToolLoanTracking_loanStatus_idx" ON "ToolLoanTracking"("loanStatus");

-- CreateIndex
CREATE INDEX "ToolLoanTracking_dueDate_idx" ON "ToolLoanTracking"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");

-- CreateIndex
CREATE INDEX "Store_code_idx" ON "Store"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Item_itemCode_key" ON "Item"("itemCode");

-- CreateIndex
CREATE INDEX "Item_itemCode_idx" ON "Item"("itemCode");

-- CreateIndex
CREATE INDEX "Item_itemClass_idx" ON "Item"("itemClass");

-- CreateIndex
CREATE UNIQUE INDEX "ItemCategory_code_key" ON "ItemCategory"("code");

-- CreateIndex
CREATE INDEX "ItemCategory_code_idx" ON "ItemCategory"("code");

-- CreateIndex
CREATE INDEX "StoreStock_storeId_idx" ON "StoreStock"("storeId");

-- CreateIndex
CREATE INDEX "StoreStock_itemId_idx" ON "StoreStock"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "StoreStock_storeId_itemId_key" ON "StoreStock"("storeId", "itemId");

-- CreateIndex
CREATE INDEX "StockReservation_mrLineId_idx" ON "StockReservation"("mrLineId");

-- CreateIndex
CREATE INDEX "StockReservation_storeId_itemId_idx" ON "StockReservation"("storeId", "itemId");

-- CreateIndex
CREATE INDEX "StockReservation_status_idx" ON "StockReservation"("status");

-- CreateIndex
CREATE INDEX "StockReservation_expiresAt_idx" ON "StockReservation"("expiresAt");

-- CreateIndex
CREATE INDEX "StockTransaction_storeId_itemId_idx" ON "StockTransaction"("storeId", "itemId");

-- CreateIndex
CREATE INDEX "StockTransaction_transactionType_idx" ON "StockTransaction"("transactionType");

-- CreateIndex
CREATE INDEX "StockTransaction_createdAt_idx" ON "StockTransaction"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "GrnHeader_grnNumber_key" ON "GrnHeader"("grnNumber");

-- CreateIndex
CREATE INDEX "GrnHeader_grnNumber_idx" ON "GrnHeader"("grnNumber");

-- CreateIndex
CREATE INDEX "GrnHeader_poId_idx" ON "GrnHeader"("poId");

-- CreateIndex
CREATE INDEX "GrnHeader_supplierId_idx" ON "GrnHeader"("supplierId");

-- CreateIndex
CREATE INDEX "GrnHeader_storeId_idx" ON "GrnHeader"("storeId");

-- CreateIndex
CREATE INDEX "GrnLine_grnId_idx" ON "GrnLine"("grnId");

-- CreateIndex
CREATE INDEX "GrnLine_itemId_idx" ON "GrnLine"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseRequest_prNumber_key" ON "PurchaseRequest"("prNumber");

-- CreateIndex
CREATE INDEX "PurchaseRequest_prNumber_idx" ON "PurchaseRequest"("prNumber");

-- CreateIndex
CREATE INDEX "PurchaseRequest_requestorId_idx" ON "PurchaseRequest"("requestorId");

-- CreateIndex
CREATE INDEX "PurchaseRequest_status_idx" ON "PurchaseRequest"("status");

-- CreateIndex
CREATE INDEX "PurchaseRequest_procurementChannel_idx" ON "PurchaseRequest"("procurementChannel");

-- CreateIndex
CREATE INDEX "PrLine_prId_idx" ON "PrLine"("prId");

-- CreateIndex
CREATE UNIQUE INDEX "PrLine_prId_lineNumber_key" ON "PrLine"("prId", "lineNumber");

-- CreateIndex
CREATE INDEX "PrApproval_prId_idx" ON "PrApproval"("prId");

-- CreateIndex
CREATE INDEX "PrApproval_approverId_idx" ON "PrApproval"("approverId");

-- CreateIndex
CREATE UNIQUE INDEX "RfqHeader_rfqNumber_key" ON "RfqHeader"("rfqNumber");

-- CreateIndex
CREATE INDEX "RfqHeader_rfqNumber_idx" ON "RfqHeader"("rfqNumber");

-- CreateIndex
CREATE INDEX "RfqHeader_prId_idx" ON "RfqHeader"("prId");

-- CreateIndex
CREATE INDEX "RfqLine_rfqId_idx" ON "RfqLine"("rfqId");

-- CreateIndex
CREATE INDEX "RfqSupplier_rfqId_idx" ON "RfqSupplier"("rfqId");

-- CreateIndex
CREATE UNIQUE INDEX "RfqSupplier_rfqId_supplierId_key" ON "RfqSupplier"("rfqId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_quotationNumber_key" ON "Quotation"("quotationNumber");

-- CreateIndex
CREATE INDEX "Quotation_rfqId_idx" ON "Quotation"("rfqId");

-- CreateIndex
CREATE INDEX "Quotation_supplierId_idx" ON "Quotation"("supplierId");

-- CreateIndex
CREATE INDEX "QuotationLine_quotationId_idx" ON "QuotationLine"("quotationId");

-- CreateIndex
CREATE INDEX "QuotationEvaluation_quotationId_idx" ON "QuotationEvaluation"("quotationId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_poNumber_idx" ON "PurchaseOrder"("poNumber");

-- CreateIndex
CREATE INDEX "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

-- CreateIndex
CREATE INDEX "PoLine_poId_idx" ON "PoLine"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "PoLine_poId_lineNumber_key" ON "PoLine"("poId", "lineNumber");

-- CreateIndex
CREATE INDEX "PoAmendment_poId_idx" ON "PoAmendment"("poId");

-- CreateIndex
CREATE UNIQUE INDEX "PoAmendment_poId_amendmentNumber_key" ON "PoAmendment"("poId", "amendmentNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierInvoice_invoiceNumber_key" ON "SupplierInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SupplierInvoice_invoiceNumber_idx" ON "SupplierInvoice"("invoiceNumber");

-- CreateIndex
CREATE INDEX "SupplierInvoice_poId_idx" ON "SupplierInvoice"("poId");

-- CreateIndex
CREATE INDEX "SupplierInvoice_supplierId_idx" ON "SupplierInvoice"("supplierId");

-- CreateIndex
CREATE INDEX "SupplierInvoice_status_idx" ON "SupplierInvoice"("status");

-- CreateIndex
CREATE INDEX "InvoiceLine_invoiceId_idx" ON "InvoiceLine"("invoiceId");

-- CreateIndex
CREATE UNIQUE INDEX "ReturnToSupplier_rtsNumber_key" ON "ReturnToSupplier"("rtsNumber");

-- CreateIndex
CREATE INDEX "ReturnToSupplier_rtsNumber_idx" ON "ReturnToSupplier"("rtsNumber");

-- CreateIndex
CREATE INDEX "ReturnToSupplier_supplierId_idx" ON "ReturnToSupplier"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "WorkshopPurchaseAuthority_workshopId_key" ON "WorkshopPurchaseAuthority"("workshopId");

-- CreateIndex
CREATE INDEX "WorkshopPurchaseAuthority_workshopId_idx" ON "WorkshopPurchaseAuthority"("workshopId");

-- CreateIndex
CREATE INDEX "LpaChangeHistory_workshopId_idx" ON "LpaChangeHistory"("workshopId");

-- CreateIndex
CREATE UNIQUE INDEX "PrChannelDecision_prId_key" ON "PrChannelDecision"("prId");

-- CreateIndex
CREATE INDEX "PrChannelDecision_prId_idx" ON "PrChannelDecision"("prId");

-- CreateIndex
CREATE INDEX "PrChannelDecision_channel_idx" ON "PrChannelDecision"("channel");

-- CreateIndex
CREATE INDEX "PrSplitRecord_originalPrId_idx" ON "PrSplitRecord"("originalPrId");

-- CreateIndex
CREATE INDEX "ChannelOverrideLog_prId_idx" ON "ChannelOverrideLog"("prId");

-- CreateIndex
CREATE INDEX "ChannelOverrideLog_poId_idx" ON "ChannelOverrideLog"("poId");

-- CreateIndex
CREATE INDEX "ChannelOverrideLog_overriddenBy_idx" ON "ChannelOverrideLog"("overriddenBy");

-- CreateIndex
CREATE INDEX "LocalApprovedVendorList_workshopId_idx" ON "LocalApprovedVendorList"("workshopId");

-- CreateIndex
CREATE INDEX "LocalApprovedVendorList_supplierId_idx" ON "LocalApprovedVendorList"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "LocalApprovedVendorList_workshopId_supplierId_key" ON "LocalApprovedVendorList"("workshopId", "supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_supplierCode_key" ON "Supplier"("supplierCode");

-- CreateIndex
CREATE INDEX "Supplier_supplierCode_idx" ON "Supplier"("supplierCode");

-- CreateIndex
CREATE INDEX "Supplier_status_idx" ON "Supplier"("status");

-- CreateIndex
CREATE INDEX "SupplierContact_supplierId_idx" ON "SupplierContact"("supplierId");

-- CreateIndex
CREATE UNIQUE INDEX "FuelTank_tankNumber_key" ON "FuelTank"("tankNumber");

-- CreateIndex
CREATE INDEX "FuelTank_tankNumber_idx" ON "FuelTank"("tankNumber");

-- CreateIndex
CREATE UNIQUE INDEX "FuelIssue_issueNumber_key" ON "FuelIssue"("issueNumber");

-- CreateIndex
CREATE INDEX "FuelIssue_tankId_idx" ON "FuelIssue"("tankId");

-- CreateIndex
CREATE INDEX "FuelIssue_assetId_idx" ON "FuelIssue"("assetId");

-- CreateIndex
CREATE INDEX "FuelIssue_issuedAt_idx" ON "FuelIssue"("issuedAt");

-- CreateIndex
CREATE INDEX "FuelReading_tankId_idx" ON "FuelReading"("tankId");

-- CreateIndex
CREATE INDEX "FuelReading_readingAt_idx" ON "FuelReading"("readingAt");

-- CreateIndex
CREATE INDEX "AbnormalDetection_detectionType_idx" ON "AbnormalDetection"("detectionType");

-- CreateIndex
CREATE INDEX "AbnormalDetection_status_idx" ON "AbnormalDetection"("status");

-- CreateIndex
CREATE INDEX "AbnormalDetection_detectedAt_idx" ON "AbnormalDetection"("detectedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalJob_jobNumber_key" ON "ExternalJob"("jobNumber");

-- CreateIndex
CREATE INDEX "ExternalJob_jobNumber_idx" ON "ExternalJob"("jobNumber");

-- CreateIndex
CREATE INDEX "ExternalJob_jobCardId_idx" ON "ExternalJob"("jobCardId");

-- CreateIndex
CREATE INDEX "ExternalJob_subcontractorId_idx" ON "ExternalJob"("subcontractorId");

-- CreateIndex
CREATE INDEX "ExternalQuotation_externalJobId_idx" ON "ExternalQuotation"("externalJobId");

-- CreateIndex
CREATE INDEX "ExtJobCost_externalJobId_idx" ON "ExtJobCost"("externalJobId");

-- CreateIndex
CREATE UNIQUE INDEX "Subcontractor_code_key" ON "Subcontractor"("code");

-- CreateIndex
CREATE INDEX "Subcontractor_code_idx" ON "Subcontractor"("code");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeNumber_key" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE INDEX "Employee_employeeNumber_idx" ON "Employee"("employeeNumber");

-- CreateIndex
CREATE INDEX "Employee_status_idx" ON "Employee"("status");

-- CreateIndex
CREATE INDEX "TimeLog_employeeId_idx" ON "TimeLog"("employeeId");

-- CreateIndex
CREATE INDEX "TimeLog_jobCardId_idx" ON "TimeLog"("jobCardId");

-- CreateIndex
CREATE INDEX "TimeLog_logDate_idx" ON "TimeLog"("logDate");

-- CreateIndex
CREATE UNIQUE INDEX "Training_code_key" ON "Training"("code");

-- CreateIndex
CREATE INDEX "Training_code_idx" ON "Training"("code");

-- CreateIndex
CREATE INDEX "TrainingCompletion_employeeId_idx" ON "TrainingCompletion"("employeeId");

-- CreateIndex
CREATE INDEX "TrainingCompletion_expiresAt_idx" ON "TrainingCompletion"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "TrainingCompletion_employeeId_trainingId_key" ON "TrainingCompletion"("employeeId", "trainingId");

-- CreateIndex
CREATE UNIQUE INDEX "Skill_code_key" ON "Skill"("code");

-- CreateIndex
CREATE INDEX "Skill_code_idx" ON "Skill"("code");

-- CreateIndex
CREATE INDEX "Skill_category_idx" ON "Skill"("category");

-- CreateIndex
CREATE INDEX "TechnicianSkill_employeeId_idx" ON "TechnicianSkill"("employeeId");

-- CreateIndex
CREATE INDEX "TechnicianSkill_skillId_idx" ON "TechnicianSkill"("skillId");

-- CreateIndex
CREATE INDEX "TechnicianSkill_status_idx" ON "TechnicianSkill"("status");

-- CreateIndex
CREATE INDEX "TechnicianSkill_expiryDate_idx" ON "TechnicianSkill"("expiryDate");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianSkill_employeeId_skillId_key" ON "TechnicianSkill"("employeeId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "PmTemplate_code_key" ON "PmTemplate"("code");

-- CreateIndex
CREATE INDEX "PmTemplate_code_idx" ON "PmTemplate"("code");

-- CreateIndex
CREATE INDEX "PmTemplate_assetCategory_idx" ON "PmTemplate"("assetCategory");

-- CreateIndex
CREATE INDEX "PmChecklistItem_templateId_idx" ON "PmChecklistItem"("templateId");

-- CreateIndex
CREATE UNIQUE INDEX "PmChecklistItem_templateId_sequence_key" ON "PmChecklistItem"("templateId", "sequence");

-- CreateIndex
CREATE UNIQUE INDEX "PmSchedule_scheduleNumber_key" ON "PmSchedule"("scheduleNumber");

-- CreateIndex
CREATE INDEX "PmSchedule_assetId_idx" ON "PmSchedule"("assetId");

-- CreateIndex
CREATE INDEX "PmSchedule_nextExecutionAt_idx" ON "PmSchedule"("nextExecutionAt");

-- CreateIndex
CREATE INDEX "PmSchedule_status_idx" ON "PmSchedule"("status");

-- CreateIndex
CREATE UNIQUE INDEX "PmExecution_executionNumber_key" ON "PmExecution"("executionNumber");

-- CreateIndex
CREATE INDEX "PmExecution_scheduleId_idx" ON "PmExecution"("scheduleId");

-- CreateIndex
CREATE INDEX "PmExecution_executionDate_idx" ON "PmExecution"("executionDate");

-- CreateIndex
CREATE INDEX "PmExecution_status_idx" ON "PmExecution"("status");

-- CreateIndex
CREATE INDEX "PmExecutionItem_executionId_idx" ON "PmExecutionItem"("executionId");

-- CreateIndex
CREATE UNIQUE INDEX "PmExecutionItem_executionId_checklistItemId_key" ON "PmExecutionItem"("executionId", "checklistItemId");

-- CreateIndex
CREATE INDEX "DowntimeLog_assetId_idx" ON "DowntimeLog"("assetId");

-- CreateIndex
CREATE INDEX "DowntimeLog_startTime_idx" ON "DowntimeLog"("startTime");

-- CreateIndex
CREATE INDEX "DowntimeLog_downtimeType_idx" ON "DowntimeLog"("downtimeType");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalWorkflow_code_key" ON "ApprovalWorkflow"("code");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_code_idx" ON "ApprovalWorkflow"("code");

-- CreateIndex
CREATE INDEX "ApprovalWorkflow_workflowType_idx" ON "ApprovalWorkflow"("workflowType");

-- CreateIndex
CREATE INDEX "ApprovalStepConfig_workflowId_idx" ON "ApprovalStepConfig"("workflowId");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStepConfig_workflowId_stepNumber_key" ON "ApprovalStepConfig"("workflowId", "stepNumber");

-- CreateIndex
CREATE INDEX "ApprovalRequest_referenceType_referenceId_idx" ON "ApprovalRequest"("referenceType", "referenceId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_requesterId_idx" ON "ApprovalRequest"("requesterId");

-- CreateIndex
CREATE INDEX "ApprovalRequest_status_idx" ON "ApprovalRequest"("status");

-- CreateIndex
CREATE INDEX "ApprovalStep_requestId_idx" ON "ApprovalStep"("requestId");

-- CreateIndex
CREATE INDEX "ApprovalStep_approverId_idx" ON "ApprovalStep"("approverId");

-- CreateIndex
CREATE INDEX "ApprovalStep_status_idx" ON "ApprovalStep"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ApprovalStep_requestId_stepNumber_key" ON "ApprovalStep"("requestId", "stepNumber");

-- CreateIndex
CREATE UNIQUE INDEX "SlaConfig_slaType_key" ON "SlaConfig"("slaType");

-- CreateIndex
CREATE INDEX "SlaConfig_slaType_idx" ON "SlaConfig"("slaType");

-- CreateIndex
CREATE INDEX "SlaTracking_entityType_entityId_idx" ON "SlaTracking"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "SlaTracking_slaType_idx" ON "SlaTracking"("slaType");

-- CreateIndex
CREATE INDEX "SlaTracking_status_idx" ON "SlaTracking"("status");

-- CreateIndex
CREATE INDEX "SlaTracking_targetAt_idx" ON "SlaTracking"("targetAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_idx" ON "AuditLog"("actorId");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "IntegrityCheck_checkType_idx" ON "IntegrityCheck"("checkType");

-- CreateIndex
CREATE INDEX "IntegrityCheck_status_idx" ON "IntegrityCheck"("status");

-- CreateIndex
CREATE INDEX "IntegrityCheck_checkedAt_idx" ON "IntegrityCheck"("checkedAt");

-- CreateIndex
CREATE INDEX "KpiSnapshot_kpiCode_idx" ON "KpiSnapshot"("kpiCode");

-- CreateIndex
CREATE INDEX "KpiSnapshot_snapshotDate_idx" ON "KpiSnapshot"("snapshotDate");

-- CreateIndex
CREATE INDEX "KpiSnapshot_period_idx" ON "KpiSnapshot"("period");

-- CreateIndex
CREATE INDEX "KpiThresholdConfig_category_idx" ON "KpiThresholdConfig"("category");

-- CreateIndex
CREATE UNIQUE INDEX "KpiThresholdConfig_kpiCode_key" ON "KpiThresholdConfig"("kpiCode");

-- CreateIndex
CREATE INDEX "ReportSchedule_reportType_idx" ON "ReportSchedule"("reportType");

-- CreateIndex
CREATE INDEX "ReportSchedule_nextRunAt_idx" ON "ReportSchedule"("nextRunAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "SystemConfig_key_idx" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "SystemConfig_category_idx" ON "SystemConfig"("category");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_code_key" ON "BudgetLine"("code");

-- CreateIndex
CREATE INDEX "BudgetLine_department_idx" ON "BudgetLine"("department");

-- CreateIndex
CREATE INDEX "BudgetLine_fiscalYear_idx" ON "BudgetLine"("fiscalYear");

-- CreateIndex
CREATE UNIQUE INDEX "BudgetLine_code_fiscalYear_key" ON "BudgetLine"("code", "fiscalYear");

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserRole" ADD CONSTRAINT "UserRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePrivilegeSet" ADD CONSTRAINT "RolePrivilegeSet_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePrivilegeSet" ADD CONSTRAINT "RolePrivilegeSet_privilegeId_fkey" FOREIGN KEY ("privilegeId") REFERENCES "PrivilegeDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceRegistry" ADD CONSTRAINT "DeviceRegistry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "AssetCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetQrCode" ADD CONSTRAINT "AssetQrCode_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetMeter" ADD CONSTRAINT "AssetMeter_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MeterReading" ADD CONSTRAINT "MeterReading_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "AssetMeter"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSpecificity" ADD CONSTRAINT "AssetSpecificity_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssetSpecificity" ADD CONSTRAINT "AssetSpecificity_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCard" ADD CONSTRAINT "JobCard_closedBy_fkey" FOREIGN KEY ("closedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JcTask" ADD CONSTRAINT "JcTask_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JcTaskPhoto" ADD CONSTRAINT "JcTaskPhoto_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "JcTask"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JcStateTransition" ADD CONSTRAINT "JcStateTransition_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JcCostLine" ADD CONSTRAINT "JcCostLine_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JcDocument" ADD CONSTRAINT "JcDocument_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JcTechnicianAssignment" ADD CONSTRAINT "JcTechnicianAssignment_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JcTechnicianAssignment" ADD CONSTRAINT "JcTechnicianAssignment_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCardApproval" ADD CONSTRAINT "JobCardApproval_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobCardApproval" ADD CONSTRAINT "JobCardApproval_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_requestorId_fkey" FOREIGN KEY ("requestorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrLine" ADD CONSTRAINT "MrLine_mrId_fkey" FOREIGN KEY ("mrId") REFERENCES "MaterialRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrLine" ADD CONSTRAINT "MrLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrStateTransition" ADD CONSTRAINT "MrStateTransition_mrId_fkey" FOREIGN KEY ("mrId") REFERENCES "MaterialRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrApprovalHistory" ADD CONSTRAINT "MrApprovalHistory_mrId_fkey" FOREIGN KEY ("mrId") REFERENCES "MaterialRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MrApprovalHistory" ADD CONSTRAINT "MrApprovalHistory_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_mrId_fkey" FOREIGN KEY ("mrId") REFERENCES "MaterialRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_issuedToId_fkey" FOREIGN KEY ("issuedToId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_verifiedById_fkey" FOREIGN KEY ("verifiedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialIssue" ADD CONSTRAINT "MaterialIssue_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiLine" ADD CONSTRAINT "MiLine_miId_fkey" FOREIGN KEY ("miId") REFERENCES "MaterialIssue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiLine" ADD CONSTRAINT "MiLine_mrLineId_fkey" FOREIGN KEY ("mrLineId") REFERENCES "MrLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiLine" ADD CONSTRAINT "MiLine_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiReturn" ADD CONSTRAINT "MiReturn_miId_fkey" FOREIGN KEY ("miId") REFERENCES "MaterialIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiReturnLine" ADD CONSTRAINT "MiReturnLine_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "MiReturn"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MiReturnLine" ADD CONSTRAINT "MiReturnLine_miLineId_fkey" FOREIGN KEY ("miLineId") REFERENCES "MiLine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreCounterLock" ADD CONSTRAINT "StoreCounterLock_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolLoanTracking" ADD CONSTRAINT "ToolLoanTracking_toolId_fkey" FOREIGN KEY ("toolId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ToolLoanTracking" ADD CONSTRAINT "ToolLoanTracking_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreStock" ADD CONSTRAINT "StoreStock_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StoreStock" ADD CONSTRAINT "StoreStock_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_mrLineId_fkey" FOREIGN KEY ("mrLineId") REFERENCES "MrLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockReservation" ADD CONSTRAINT "StockReservation_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_miId_fkey" FOREIGN KEY ("miId") REFERENCES "MaterialIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "MiReturn"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockTransaction" ADD CONSTRAINT "StockTransaction_performedBy_fkey" FOREIGN KEY ("performedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrnHeader" ADD CONSTRAINT "GrnHeader_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrnHeader" ADD CONSTRAINT "GrnHeader_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrnHeader" ADD CONSTRAINT "GrnHeader_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrnHeader" ADD CONSTRAINT "GrnHeader_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrnHeader" ADD CONSTRAINT "GrnHeader_verifiedBy_fkey" FOREIGN KEY ("verifiedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GrnLine" ADD CONSTRAINT "GrnLine_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "GrnHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrLine" ADD CONSTRAINT "PrLine_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrApproval" ADD CONSTRAINT "PrApproval_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PurchaseRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqHeader" ADD CONSTRAINT "RfqHeader_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PurchaseRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqLine" ADD CONSTRAINT "RfqLine_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqLine" ADD CONSTRAINT "RfqLine_prLineId_fkey" FOREIGN KEY ("prLineId") REFERENCES "PrLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqSupplier" ADD CONSTRAINT "RfqSupplier_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqHeader"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RfqSupplier" ADD CONSTRAINT "RfqSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "RfqHeader"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationLine" ADD CONSTRAINT "QuotationLine_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationEvaluation" ADD CONSTRAINT "QuotationEvaluation_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoLine" ADD CONSTRAINT "PoLine_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PoAmendment" ADD CONSTRAINT "PoAmendment_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_poId_fkey" FOREIGN KEY ("poId") REFERENCES "PurchaseOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierInvoice" ADD CONSTRAINT "SupplierInvoice_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceLine" ADD CONSTRAINT "InvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "SupplierInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReturnToSupplier" ADD CONSTRAINT "ReturnToSupplier_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrChannelDecision" ADD CONSTRAINT "PrChannelDecision_prId_fkey" FOREIGN KEY ("prId") REFERENCES "PurchaseRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LocalApprovedVendorList" ADD CONSTRAINT "LocalApprovedVendorList_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SupplierContact" ADD CONSTRAINT "SupplierContact_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelIssue" ADD CONSTRAINT "FuelIssue_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelIssue" ADD CONSTRAINT "FuelIssue_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelReading" ADD CONSTRAINT "FuelReading_tankId_fkey" FOREIGN KEY ("tankId") REFERENCES "FuelTank"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbnormalDetection" ADD CONSTRAINT "AbnormalDetection_referenceId_fkey" FOREIGN KEY ("referenceId") REFERENCES "FuelIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalJob" ADD CONSTRAINT "ExternalJob_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalQuotation" ADD CONSTRAINT "ExternalQuotation_externalJobId_fkey" FOREIGN KEY ("externalJobId") REFERENCES "ExternalJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExtJobCost" ADD CONSTRAINT "ExtJobCost_externalJobId_fkey" FOREIGN KEY ("externalJobId") REFERENCES "ExternalJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TimeLog" ADD CONSTRAINT "TimeLog_jobCardId_fkey" FOREIGN KEY ("jobCardId") REFERENCES "JobCard"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrainingCompletion" ADD CONSTRAINT "TrainingCompletion_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "Training"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianSkill" ADD CONSTRAINT "TechnicianSkill_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianSkill" ADD CONSTRAINT "TechnicianSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmChecklistItem" ADD CONSTRAINT "PmChecklistItem_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PmTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmSchedule" ADD CONSTRAINT "PmSchedule_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmSchedule" ADD CONSTRAINT "PmSchedule_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "PmTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmExecution" ADD CONSTRAINT "PmExecution_scheduleId_fkey" FOREIGN KEY ("scheduleId") REFERENCES "PmSchedule"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmExecutionItem" ADD CONSTRAINT "PmExecutionItem_executionId_fkey" FOREIGN KEY ("executionId") REFERENCES "PmExecution"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PmExecutionItem" ADD CONSTRAINT "PmExecutionItem_checklistItemId_fkey" FOREIGN KEY ("checklistItemId") REFERENCES "PmChecklistItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DowntimeLog" ADD CONSTRAINT "DowntimeLog_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStepConfig" ADD CONSTRAINT "ApprovalStepConfig_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "ApprovalWorkflow"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "ApprovalRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApprovalStep" ADD CONSTRAINT "ApprovalStep_approverId_fkey" FOREIGN KEY ("approverId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
