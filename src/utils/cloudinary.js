import {v2 as cloudinary} from 'cloudinary';  
import fs from 'fs';

//configure cloudinary
    cloudinary.config({ 
        cloud_name: process.env.CLOUDINARY_NAME, 
        api_key: process.env.CLOUDINARY_API_KEY, 
        api_secret: process.env.CLOUDINARY_API_SECRET
    });


    const uploadOnCloudinary = async (localfilepath) => {
      try {
        if (!localfilepath) return null;
       const response = await cloudinary.uploader.upload(
          localfilepath,
          { resource_type: 'auto' })
          console.log('File uploaded successfully:', response.url); 
          fs.unlinkSync(localfilepath)
          return response
      } catch (error) {
        fs.unlinksync(localfilepath); // to delete the file from local storage which is in multer temp folder
        return null;
      }
    }
       
    export { uploadOnCloudinary }