-- CreateEnum
CREATE TYPE "public"."EventStatus" AS ENUM ('ACTIVE', 'PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."AlbumStatus" AS ENUM ('ACTIVE', 'PROCESSING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."DriveFolderStatus" AS ENUM ('ACTIVE', 'PROCESSING', 'COMPLETED', 'ERROR');

-- CreateEnum
CREATE TYPE "public"."PhotoStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."ProcessingType" AS ENUM ('UPLOAD', 'QUALITY_CHECK', 'FACE_DETECTION', 'CLUSTERING');

-- CreateEnum
CREATE TYPE "public"."ProcessingStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "public"."Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "public"."Event" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "userId" TEXT NOT NULL,
    "status" "public"."EventStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Album" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "eventId" TEXT NOT NULL,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."AlbumStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Album_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."DriveFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "driveLink" TEXT NOT NULL,
    "driveFolderId" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "status" "public"."DriveFolderStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DriveFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Person" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "clusterId" TEXT NOT NULL,
    "photoCount" INTEGER NOT NULL DEFAULT 0,
    "thumbnailPath" TEXT,
    "averageConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Person_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Photo" (
    "id" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "albumId" TEXT,
    "driveFolderId" TEXT,
    "eventId" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isGoodQuality" BOOLEAN NOT NULL DEFAULT false,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "processedAt" TIMESTAMP(3),
    "status" "public"."PhotoStatus" NOT NULL DEFAULT 'PROCESSING',
    "driveFileId" TEXT,

    CONSTRAINT "Photo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Face" (
    "id" TEXT NOT NULL,
    "fotoId" TEXT NOT NULL,
    "photoId" TEXT NOT NULL,
    "personId" TEXT,
    "clusterId" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[],
    "facialAreaX" INTEGER NOT NULL,
    "facialAreaY" INTEGER NOT NULL,
    "facialAreaW" INTEGER NOT NULL,
    "facialAreaH" INTEGER NOT NULL,
    "faceConfidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Face_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProcessingActivity" (
    "id" TEXT NOT NULL,
    "type" "public"."ProcessingType" NOT NULL,
    "status" "public"."ProcessingStatus" NOT NULL,
    "eventId" TEXT NOT NULL,
    "albumId" TEXT,
    "eventName" TEXT NOT NULL,
    "albumName" TEXT,
    "photoName" TEXT NOT NULL,
    "facesDetected" INTEGER,
    "clustersCreated" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "error" TEXT,

    CONSTRAINT "ProcessingActivity_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "public"."Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "public"."Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "public"."User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "public"."VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "public"."VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "Event_userId_idx" ON "public"."Event"("userId");

-- CreateIndex
CREATE INDEX "Album_eventId_idx" ON "public"."Album"("eventId");

-- CreateIndex
CREATE INDEX "DriveFolder_albumId_idx" ON "public"."DriveFolder"("albumId");

-- CreateIndex
CREATE UNIQUE INDEX "DriveFolder_driveFolderId_albumId_key" ON "public"."DriveFolder"("driveFolderId", "albumId");

-- CreateIndex
CREATE INDEX "Person_eventId_idx" ON "public"."Person"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Person_eventId_clusterId_key" ON "public"."Person"("eventId", "clusterId");

-- CreateIndex
CREATE UNIQUE INDEX "Photo_path_key" ON "public"."Photo"("path");

-- CreateIndex
CREATE INDEX "Photo_albumId_idx" ON "public"."Photo"("albumId");

-- CreateIndex
CREATE INDEX "Photo_driveFolderId_idx" ON "public"."Photo"("driveFolderId");

-- CreateIndex
CREATE INDEX "Photo_eventId_idx" ON "public"."Photo"("eventId");

-- CreateIndex
CREATE UNIQUE INDEX "Face_fotoId_key" ON "public"."Face"("fotoId");

-- CreateIndex
CREATE INDEX "Face_photoId_idx" ON "public"."Face"("photoId");

-- CreateIndex
CREATE INDEX "Face_personId_idx" ON "public"."Face"("personId");

-- CreateIndex
CREATE INDEX "Face_clusterId_idx" ON "public"."Face"("clusterId");

-- CreateIndex
CREATE INDEX "ProcessingActivity_eventId_idx" ON "public"."ProcessingActivity"("eventId");

-- CreateIndex
CREATE INDEX "ProcessingActivity_albumId_idx" ON "public"."ProcessingActivity"("albumId");

-- AddForeignKey
ALTER TABLE "public"."Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Event" ADD CONSTRAINT "Event_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Album" ADD CONSTRAINT "Album_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."DriveFolder" ADD CONSTRAINT "DriveFolder_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."Album"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Person" ADD CONSTRAINT "Person_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "public"."Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Photo" ADD CONSTRAINT "Photo_albumId_fkey" FOREIGN KEY ("albumId") REFERENCES "public"."Album"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Photo" ADD CONSTRAINT "Photo_driveFolderId_fkey" FOREIGN KEY ("driveFolderId") REFERENCES "public"."DriveFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Face" ADD CONSTRAINT "Face_photoId_fkey" FOREIGN KEY ("photoId") REFERENCES "public"."Photo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Face" ADD CONSTRAINT "Face_personId_fkey" FOREIGN KEY ("personId") REFERENCES "public"."Person"("id") ON DELETE SET NULL ON UPDATE CASCADE;
