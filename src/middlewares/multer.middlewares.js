import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "./public/temp")
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname)
    }
})

export const upload = multer({
    storage
})

// Frontend sends an image, multer temporarily stores it on the server, cloudinary uploads it and returns a public URL, the database stores that URL, and the frontend uses it to display the image.
