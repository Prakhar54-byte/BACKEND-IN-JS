import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {// cb callback function
      cb(null, "./public/temp") // null means no error
    },
    filename: function (req, file, cb) {
      
      cb(null, file.originalname) // change it to a unique name
    }
  })
  
export  const upload = multer({ 
    storage: storage 
})
