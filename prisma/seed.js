import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

try {
  await prisma.aboutOrganisasi.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      tagline: 'Entrepreneurs Club adalah ruang bagi anak muda untuk belajar, berkarya, dan bertumbuh bersama. Dari ide sederhana menjadi bisnis nyata, kami membangun mental wirausaha, jejaring kuat, dan dampak berkelanjutan.',
      visi: 'Visi Entrepreneurs Club belum ditetapkan.',
      deskripsi_singkat: 'Profil Entrepreneurs Club.',
    },
  });
} finally {
  await prisma.$disconnect();
}
