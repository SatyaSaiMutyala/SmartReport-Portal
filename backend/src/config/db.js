import mongoose from 'mongoose';

const RETRY_MS = 5000;

export async function connectDB(uri) {
  mongoose.connection.on('connected', () => console.log('MongoDB connected'));
  mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));

  // Keep retrying so the API stays up (health reports db: disconnected) until Mongo is reachable
  while (true) {
    try {
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
      return;
    } catch (err) {
      console.error(`MongoDB connection failed (${err.message}); retrying in ${RETRY_MS / 1000}s`);
      await new Promise((r) => setTimeout(r, RETRY_MS));
    }
  }
}
