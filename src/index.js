import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { app } from './app.js';


dotenv.config();


const PORT = process.env.PORT || 3001

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB connected!");

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
      
    });
  } catch (err) {
    console.error("Failed to connect to MongoDB:", err);
  }
};





connectDB();
