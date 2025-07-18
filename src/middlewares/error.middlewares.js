import mongoose from "mongoose";

import { Apierror } from "../utils/ApiError.js";


const errorHandler = (err, req, res, next) => {
    let error = err;
    if (!(err instanceof Apierror)) {
        const statusCode = err.statusCode || error instanceof mongoose.Error ? 400 : 500;

        const messaage = err.message || "something went wrong";
        error = new Apierror(messaage, statusCode, error?.errors || [], err.stack);
    } 

    const response = {
        ...error,
        message: error.message,
        ...(process.env.NODE_ENV === "development" ? {
            stack: error.stack
        } : {})
    }
      return res.status(error.statusCode || 500).json(response);
    
}



export {errorHandler}