-- CreateTable
CREATE TABLE "Enquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "companyName" TEXT,
    "fleetSizeBand" TEXT,
    "timeframe" TEXT,
    "assignedTo" TEXT
);

-- CreateTable
CREATE TABLE "EnquiryContext" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enquiryId" TEXT NOT NULL,
    "pageUrl" TEXT NOT NULL,
    "referrer" TEXT,
    "utmSource" TEXT,
    "utmMedium" TEXT,
    "utmCampaign" TEXT,
    "device" TEXT,
    CONSTRAINT "EnquiryContext_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PartExchangeDetails" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "enquiryId" TEXT NOT NULL,
    "reg" TEXT NOT NULL,
    "mileage" INTEGER NOT NULL,
    CONSTRAINT "PartExchangeDetails_enquiryId_fkey" FOREIGN KEY ("enquiryId") REFERENCES "Enquiry" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "EnquiryContext_enquiryId_key" ON "EnquiryContext"("enquiryId");

-- CreateIndex
CREATE UNIQUE INDEX "PartExchangeDetails_enquiryId_key" ON "PartExchangeDetails"("enquiryId");
