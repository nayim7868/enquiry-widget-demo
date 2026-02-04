-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Enquiry" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "slaDueAt" DATETIME,
    "firstRespondedAt" DATETIME,
    "queue" TEXT NOT NULL DEFAULT 'GENERAL',
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "message" TEXT NOT NULL,
    "companyName" TEXT,
    "fleetSizeBand" TEXT,
    "timeframe" TEXT,
    "assignedTo" TEXT
);
INSERT INTO "new_Enquiry" ("assignedTo", "companyName", "createdAt", "email", "firstRespondedAt", "fleetSizeBand", "id", "message", "mode", "name", "phone", "priority", "slaDueAt", "status", "timeframe", "type") SELECT "assignedTo", "companyName", "createdAt", "email", "firstRespondedAt", "fleetSizeBand", "id", "message", "mode", "name", "phone", "priority", "slaDueAt", "status", "timeframe", "type" FROM "Enquiry";
DROP TABLE "Enquiry";
ALTER TABLE "new_Enquiry" RENAME TO "Enquiry";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
