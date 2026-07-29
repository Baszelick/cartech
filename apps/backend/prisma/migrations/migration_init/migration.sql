-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('SYSTEM_OWNER', 'OPERATIONS_MANAGER', 'TECHNICIAN', 'VIEWER');

-- CreateEnum
CREATE TYPE "CarLifecycleStatus" AS ENUM ('ACTIVE', 'ISSUED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "PsoStatus" AS ENUM ('PENDING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "DeliveryAppointmentStatus" AS ENUM ('SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "FeedPostType" AS ENUM ('SYSTEM', 'USER');

-- CreateEnum
CREATE TYPE "FeedScope" AS ENUM ('COMPANY', 'LOCATION');

-- CreateEnum
CREATE TYPE "FeedReactionType" AS ENUM ('LIKE', 'VIEWED', 'DONE');

-- CreateEnum
CREATE TYPE "VehicleEventType" AS ENUM ('CAR_ARRIVED', 'PSO_COMPLETED', 'PSO_REOPENED', 'BATTERY_CHECK_COMPLETED', 'CAR_BLOCKED', 'CAR_UNBLOCKED', 'CAR_MOVED', 'DELIVERY_SCHEDULED', 'DELIVERY_RESCHEDULED', 'DELIVERY_CANCELLED', 'CAR_ISSUED', 'CAR_RETURNED', 'CAR_ARCHIVED', 'CAR_RESTORED', 'CAR_UPDATED');

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sites" (
    "id" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_location_accesses" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_location_accesses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_sessions" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "refreshTokenHash" TEXT NOT NULL,
    "userAgent" TEXT,
    "ipAddress" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cars" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "ownerLocationId" UUID NOT NULL,
    "currentSiteId" UUID NOT NULL,
    "arrivalSiteId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "vin" TEXT NOT NULL,
    "shortVin" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "color" TEXT,
    "arrivedOn" DATE NOT NULL,
    "lifecycleStatus" "CarLifecycleStatus" NOT NULL DEFAULT 'ACTIVE',
    "isBlocked" BOOLEAN NOT NULL DEFAULT false,
    "blockedReason" TEXT,
    "blockedById" UUID,
    "blockedAt" TIMESTAMP(3),
    "archivedReason" TEXT,
    "archivedById" UUID,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cars_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "psos" (
    "id" UUID NOT NULL,
    "carId" UUID NOT NULL,
    "status" "PsoStatus" NOT NULL DEFAULT 'PENDING',
    "deadlineOn" DATE NOT NULL,
    "completedOn" DATE,
    "completedById" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "psos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "battery_checks" (
    "id" UUID NOT NULL,
    "carId" UUID NOT NULL,
    "checkedById" UUID NOT NULL,
    "checkedOn" DATE NOT NULL,
    "voltage" DECIMAL(4,2),
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "battery_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_movements" (
    "id" UUID NOT NULL,
    "carId" UUID NOT NULL,
    "fromSiteId" UUID NOT NULL,
    "toSiteId" UUID NOT NULL,
    "movedById" UUID NOT NULL,
    "comment" TEXT,
    "movedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "delivery_appointments" (
    "id" UUID NOT NULL,
    "carId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "cancelledById" UUID,
    "scheduledOn" DATE NOT NULL,
    "scheduledHour" INTEGER NOT NULL,
    "status" "DeliveryAppointmentStatus" NOT NULL DEFAULT 'SCHEDULED',
    "cancellationReason" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "delivery_appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_issues" (
    "id" UUID NOT NULL,
    "carId" UUID NOT NULL,
    "appointmentId" UUID,
    "issuedOn" DATE NOT NULL,
    "issuedById" UUID NOT NULL,
    "returnedOn" DATE,
    "returnedById" UUID,
    "returnSiteId" UUID,
    "returnReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicle_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_events" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "carId" UUID NOT NULL,
    "locationId" UUID NOT NULL,
    "destinationLocationId" UUID,
    "performedById" UUID,
    "type" "VehicleEventType" NOT NULL,
    "title" TEXT NOT NULL,
    "details" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_posts" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "locationId" UUID,
    "authorId" UUID,
    "carId" UUID,
    "vehicleEventId" UUID,
    "type" "FeedPostType" NOT NULL,
    "scope" "FeedScope" NOT NULL,
    "systemEventType" TEXT,
    "content" TEXT,
    "metadata" JSONB,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_comments" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "content" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "feed_comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_post_reactions" (
    "id" UUID NOT NULL,
    "postId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "FeedReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_post_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feed_comment_reactions" (
    "id" UUID NOT NULL,
    "commentId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "FeedReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feed_comment_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "previousData" JSONB,
    "newData" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "locations_companyId_idx" ON "locations"("companyId");

-- CreateIndex
CREATE INDEX "locations_companyId_isActive_idx" ON "locations"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "locations_companyId_code_key" ON "locations"("companyId", "code");

-- CreateIndex
CREATE INDEX "sites_locationId_idx" ON "sites"("locationId");

-- CreateIndex
CREATE INDEX "sites_locationId_isActive_idx" ON "sites"("locationId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "sites_locationId_name_key" ON "sites"("locationId", "name");

-- CreateIndex
CREATE INDEX "users_companyId_idx" ON "users"("companyId");

-- CreateIndex
CREATE INDEX "users_companyId_isActive_idx" ON "users"("companyId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "users_companyId_username_key" ON "users"("companyId", "username");

-- CreateIndex
CREATE INDEX "user_role_assignments_userId_idx" ON "user_role_assignments"("userId");

-- CreateIndex
CREATE INDEX "user_role_assignments_role_idx" ON "user_role_assignments"("role");

-- CreateIndex
CREATE UNIQUE INDEX "user_role_assignments_userId_role_key" ON "user_role_assignments"("userId", "role");

-- CreateIndex
CREATE INDEX "user_location_accesses_userId_idx" ON "user_location_accesses"("userId");

-- CreateIndex
CREATE INDEX "user_location_accesses_locationId_idx" ON "user_location_accesses"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "user_location_accesses_userId_locationId_key" ON "user_location_accesses"("userId", "locationId");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_idx" ON "auth_sessions"("userId");

-- CreateIndex
CREATE INDEX "auth_sessions_expiresAt_idx" ON "auth_sessions"("expiresAt");

-- CreateIndex
CREATE INDEX "auth_sessions_userId_revokedAt_idx" ON "auth_sessions"("userId", "revokedAt");

-- CreateIndex
CREATE INDEX "cars_companyId_shortVin_idx" ON "cars"("companyId", "shortVin");

-- CreateIndex
CREATE INDEX "cars_companyId_lifecycleStatus_idx" ON "cars"("companyId", "lifecycleStatus");

-- CreateIndex
CREATE INDEX "cars_ownerLocationId_lifecycleStatus_idx" ON "cars"("ownerLocationId", "lifecycleStatus");

-- CreateIndex
CREATE INDEX "cars_currentSiteId_lifecycleStatus_idx" ON "cars"("currentSiteId", "lifecycleStatus");

-- CreateIndex
CREATE INDEX "cars_ownerLocationId_isBlocked_idx" ON "cars"("ownerLocationId", "isBlocked");

-- CreateIndex
CREATE INDEX "cars_arrivedOn_idx" ON "cars"("arrivedOn");

-- CreateIndex
CREATE UNIQUE INDEX "cars_companyId_vin_key" ON "cars"("companyId", "vin");

-- CreateIndex
CREATE UNIQUE INDEX "psos_carId_key" ON "psos"("carId");

-- CreateIndex
CREATE INDEX "psos_status_idx" ON "psos"("status");

-- CreateIndex
CREATE INDEX "psos_deadlineOn_idx" ON "psos"("deadlineOn");

-- CreateIndex
CREATE INDEX "psos_status_deadlineOn_idx" ON "psos"("status", "deadlineOn");

-- CreateIndex
CREATE INDEX "psos_completedById_idx" ON "psos"("completedById");

-- CreateIndex
CREATE INDEX "battery_checks_carId_idx" ON "battery_checks"("carId");

-- CreateIndex
CREATE INDEX "battery_checks_checkedById_idx" ON "battery_checks"("checkedById");

-- CreateIndex
CREATE INDEX "battery_checks_checkedOn_idx" ON "battery_checks"("checkedOn");

-- CreateIndex
CREATE INDEX "battery_checks_carId_checkedOn_idx" ON "battery_checks"("carId", "checkedOn");

-- CreateIndex
CREATE INDEX "vehicle_movements_carId_idx" ON "vehicle_movements"("carId");

-- CreateIndex
CREATE INDEX "vehicle_movements_fromSiteId_idx" ON "vehicle_movements"("fromSiteId");

-- CreateIndex
CREATE INDEX "vehicle_movements_toSiteId_idx" ON "vehicle_movements"("toSiteId");

-- CreateIndex
CREATE INDEX "vehicle_movements_movedById_idx" ON "vehicle_movements"("movedById");

-- CreateIndex
CREATE INDEX "vehicle_movements_carId_movedAt_idx" ON "vehicle_movements"("carId", "movedAt");

-- CreateIndex
CREATE INDEX "delivery_appointments_carId_idx" ON "delivery_appointments"("carId");

-- CreateIndex
CREATE INDEX "delivery_appointments_createdById_idx" ON "delivery_appointments"("createdById");

-- CreateIndex
CREATE INDEX "delivery_appointments_cancelledById_idx" ON "delivery_appointments"("cancelledById");

-- CreateIndex
CREATE INDEX "delivery_appointments_scheduledOn_idx" ON "delivery_appointments"("scheduledOn");

-- CreateIndex
CREATE INDEX "delivery_appointments_scheduledOn_scheduledHour_idx" ON "delivery_appointments"("scheduledOn", "scheduledHour");

-- CreateIndex
CREATE INDEX "delivery_appointments_status_scheduledOn_idx" ON "delivery_appointments"("status", "scheduledOn");

-- CreateIndex
CREATE INDEX "delivery_appointments_carId_status_idx" ON "delivery_appointments"("carId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "vehicle_issues_appointmentId_key" ON "vehicle_issues"("appointmentId");

-- CreateIndex
CREATE INDEX "vehicle_issues_carId_idx" ON "vehicle_issues"("carId");

-- CreateIndex
CREATE INDEX "vehicle_issues_issuedById_idx" ON "vehicle_issues"("issuedById");

-- CreateIndex
CREATE INDEX "vehicle_issues_returnedById_idx" ON "vehicle_issues"("returnedById");

-- CreateIndex
CREATE INDEX "vehicle_issues_returnSiteId_idx" ON "vehicle_issues"("returnSiteId");

-- CreateIndex
CREATE INDEX "vehicle_issues_issuedOn_idx" ON "vehicle_issues"("issuedOn");

-- CreateIndex
CREATE INDEX "vehicle_issues_carId_returnedOn_idx" ON "vehicle_issues"("carId", "returnedOn");

-- CreateIndex
CREATE INDEX "vehicle_events_companyId_idx" ON "vehicle_events"("companyId");

-- CreateIndex
CREATE INDEX "vehicle_events_carId_idx" ON "vehicle_events"("carId");

-- CreateIndex
CREATE INDEX "vehicle_events_locationId_idx" ON "vehicle_events"("locationId");

-- CreateIndex
CREATE INDEX "vehicle_events_destinationLocationId_idx" ON "vehicle_events"("destinationLocationId");

-- CreateIndex
CREATE INDEX "vehicle_events_performedById_idx" ON "vehicle_events"("performedById");

-- CreateIndex
CREATE INDEX "vehicle_events_type_idx" ON "vehicle_events"("type");

-- CreateIndex
CREATE INDEX "vehicle_events_carId_occurredAt_idx" ON "vehicle_events"("carId", "occurredAt");

-- CreateIndex
CREATE INDEX "vehicle_events_locationId_occurredAt_idx" ON "vehicle_events"("locationId", "occurredAt");

-- CreateIndex
CREATE INDEX "feed_posts_companyId_idx" ON "feed_posts"("companyId");

-- CreateIndex
CREATE INDEX "feed_posts_locationId_idx" ON "feed_posts"("locationId");

-- CreateIndex
CREATE INDEX "feed_posts_authorId_idx" ON "feed_posts"("authorId");

-- CreateIndex
CREATE INDEX "feed_posts_carId_idx" ON "feed_posts"("carId");

-- CreateIndex
CREATE INDEX "feed_posts_vehicleEventId_idx" ON "feed_posts"("vehicleEventId");

-- CreateIndex
CREATE INDEX "feed_posts_companyId_scope_createdAt_idx" ON "feed_posts"("companyId", "scope", "createdAt");

-- CreateIndex
CREATE INDEX "feed_posts_locationId_createdAt_idx" ON "feed_posts"("locationId", "createdAt");

-- CreateIndex
CREATE INDEX "feed_posts_companyId_isPinned_idx" ON "feed_posts"("companyId", "isPinned");

-- CreateIndex
CREATE INDEX "feed_posts_locationId_isPinned_idx" ON "feed_posts"("locationId", "isPinned");

-- CreateIndex
CREATE INDEX "feed_posts_deletedAt_idx" ON "feed_posts"("deletedAt");

-- CreateIndex
CREATE INDEX "feed_comments_postId_idx" ON "feed_comments"("postId");

-- CreateIndex
CREATE INDEX "feed_comments_authorId_idx" ON "feed_comments"("authorId");

-- CreateIndex
CREATE INDEX "feed_comments_postId_createdAt_idx" ON "feed_comments"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "feed_comments_deletedAt_idx" ON "feed_comments"("deletedAt");

-- CreateIndex
CREATE INDEX "feed_post_reactions_postId_idx" ON "feed_post_reactions"("postId");

-- CreateIndex
CREATE INDEX "feed_post_reactions_userId_idx" ON "feed_post_reactions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "feed_post_reactions_postId_userId_type_key" ON "feed_post_reactions"("postId", "userId", "type");

-- CreateIndex
CREATE INDEX "feed_comment_reactions_commentId_idx" ON "feed_comment_reactions"("commentId");

-- CreateIndex
CREATE INDEX "feed_comment_reactions_userId_idx" ON "feed_comment_reactions"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "feed_comment_reactions_commentId_userId_type_key" ON "feed_comment_reactions"("commentId", "userId", "type");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_idx" ON "audit_logs"("companyId");

-- CreateIndex
CREATE INDEX "audit_logs_userId_idx" ON "audit_logs"("userId");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_idx" ON "audit_logs"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_createdAt_idx" ON "audit_logs"("companyId", "createdAt");

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sites" ADD CONSTRAINT "sites_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_role_assignments" ADD CONSTRAINT "user_role_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_location_accesses" ADD CONSTRAINT "user_location_accesses_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_location_accesses" ADD CONSTRAINT "user_location_accesses_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_sessions" ADD CONSTRAINT "auth_sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_ownerLocationId_fkey" FOREIGN KEY ("ownerLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_currentSiteId_fkey" FOREIGN KEY ("currentSiteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_arrivalSiteId_fkey" FOREIGN KEY ("arrivalSiteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_blockedById_fkey" FOREIGN KEY ("blockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cars" ADD CONSTRAINT "cars_archivedById_fkey" FOREIGN KEY ("archivedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psos" ADD CONSTRAINT "psos_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "psos" ADD CONSTRAINT "psos_completedById_fkey" FOREIGN KEY ("completedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battery_checks" ADD CONSTRAINT "battery_checks_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "battery_checks" ADD CONSTRAINT "battery_checks_checkedById_fkey" FOREIGN KEY ("checkedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_movements" ADD CONSTRAINT "vehicle_movements_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_movements" ADD CONSTRAINT "vehicle_movements_fromSiteId_fkey" FOREIGN KEY ("fromSiteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_movements" ADD CONSTRAINT "vehicle_movements_toSiteId_fkey" FOREIGN KEY ("toSiteId") REFERENCES "sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_movements" ADD CONSTRAINT "vehicle_movements_movedById_fkey" FOREIGN KEY ("movedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_appointments" ADD CONSTRAINT "delivery_appointments_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_appointments" ADD CONSTRAINT "delivery_appointments_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "delivery_appointments" ADD CONSTRAINT "delivery_appointments_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_issues" ADD CONSTRAINT "vehicle_issues_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_issues" ADD CONSTRAINT "vehicle_issues_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "delivery_appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_issues" ADD CONSTRAINT "vehicle_issues_issuedById_fkey" FOREIGN KEY ("issuedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_issues" ADD CONSTRAINT "vehicle_issues_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_issues" ADD CONSTRAINT "vehicle_issues_returnSiteId_fkey" FOREIGN KEY ("returnSiteId") REFERENCES "sites"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_events" ADD CONSTRAINT "vehicle_events_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_events" ADD CONSTRAINT "vehicle_events_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_events" ADD CONSTRAINT "vehicle_events_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_events" ADD CONSTRAINT "vehicle_events_destinationLocationId_fkey" FOREIGN KEY ("destinationLocationId") REFERENCES "locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_events" ADD CONSTRAINT "vehicle_events_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_carId_fkey" FOREIGN KEY ("carId") REFERENCES "cars"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_vehicleEventId_fkey" FOREIGN KEY ("vehicleEventId") REFERENCES "vehicle_events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_postId_fkey" FOREIGN KEY ("postId") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comments" ADD CONSTRAINT "feed_comments_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_reactions" ADD CONSTRAINT "feed_post_reactions_postId_fkey" FOREIGN KEY ("postId") REFERENCES "feed_posts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_post_reactions" ADD CONSTRAINT "feed_post_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comment_reactions" ADD CONSTRAINT "feed_comment_reactions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "feed_comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feed_comment_reactions" ADD CONSTRAINT "feed_comment_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
