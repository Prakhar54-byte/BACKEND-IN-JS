import multer from "multer";

const storage = multer.diskStorage({
    destination: function (req, file, cb) {// cb callback function
      cb(null, "./public/temp") // null means no error
    },
    filename: function (req, file, cb) {
      
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.fieldname + '-' + uniqueSuffix) // change it to a unique name
    }
  })
  
export  const upload = multer({ 
    storage: storage 
})


