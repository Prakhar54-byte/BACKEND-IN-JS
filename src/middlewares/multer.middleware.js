import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, "./public/uploads")
      console.log("File destination: ", file);
      
    },
    filename: function (req, file, cb) {
      
      cb(null, file.originalname)
      console.log("File name: ", file.originalname);
    }
  })
  
export const upload = multer({ 
    storage, 
})