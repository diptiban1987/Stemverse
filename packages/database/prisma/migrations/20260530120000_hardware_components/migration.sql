-- CreateTable
CREATE TABLE "boards" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "architecture" TEXT NOT NULL,
    "capabilities" JSONB NOT NULL DEFAULT '{}',
    "digital_pins" JSONB NOT NULL DEFAULT '[]',
    "analog_pins" JSONB NOT NULL DEFAULT '[]',
    "pwm_pins" JSONB NOT NULL DEFAULT '[]',
    "default_config" JSONB NOT NULL DEFAULT '{}',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "boards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sensors" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "properties" JSONB NOT NULL DEFAULT '[]',
    "default_pin" INTEGER,
    "libraries" JSONB NOT NULL DEFAULT '[]',
    "block_type" TEXT NOT NULL,
    "generator_key" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "board_support" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sensors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "actuators" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "fields" JSONB NOT NULL DEFAULT '[]',
    "libraries" JSONB NOT NULL DEFAULT '[]',
    "block_type" TEXT NOT NULL,
    "generator_key" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "board_support" JSONB NOT NULL DEFAULT '[]',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "actuators_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "boards_slug_key" ON "boards"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "sensors_slug_key" ON "sensors"("slug");

-- CreateIndex
CREATE INDEX "sensors_category_idx" ON "sensors"("category");

-- CreateIndex
CREATE UNIQUE INDEX "actuators_slug_key" ON "actuators"("slug");

-- CreateIndex
CREATE INDEX "actuators_category_idx" ON "actuators"("category");
