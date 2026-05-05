import mongoose from "mongoose";

const connectDB = async () => {
    try {
        mongoose.connection.on('connected', () => {
            console.log('MongoDB Connected');
        });

        await mongoose.connect(process.env.MONGO_URI as string);

    } catch (error) {
        console.error('Connection Error in DB : ', error);
    }
};

export default connectDB;