-- AlterTable
ALTER TABLE "ArtisanProfile" ADD COLUMN     "voiceIntroDurationSec" DOUBLE PRECISION,
ADD COLUMN     "voiceIntroKey" TEXT,
ADD COLUMN     "voiceIntroLocale" "Locale",
ADD COLUMN     "voiceIntroTranscript" TEXT;
