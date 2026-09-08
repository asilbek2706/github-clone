import 'dotenv/config';

import app from './app.js';
import prisma from './config/prisma.js';

const PORT = Number(process.env.PORT ?? 5000);

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

const shutdown = async (signal: string): Promise<void> => {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server.close(async () => {
    await prisma.$disconnect();

    console.log('✅ Database connection closed');
    console.log('👋 Server stopped');

    process.exit(0);
  });
};

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});
