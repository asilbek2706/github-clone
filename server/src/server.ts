import app from './app.js';
import { env } from './config/env.js';
import prisma from './config/prisma.js';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Server running on http://localhost:${env.PORT}`);
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
