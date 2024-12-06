import multer from "multer";

// const storage = multer.diskStorage({
//     destination: function (req, file, cb) {// cb callback function
//       cb(null, "/public/temp") 
//     },
//     filename: function (req, file, cb) {
      
//       const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
//       cb(null, file.fieldname + '-' + uniqueSuffix) 
//     }
//   })
import { fileURLToPath } from 'url';
import path from 'path';

// Equivalent to __dirname in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const tempPath = path.join(__dirname, 'public/temp'); // Adjusted to resolve correctly
        cb(null, tempPath);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix);
    },
});


import fs from 'fs';

const tempPath = path.join(__dirname, 'public/temp');

if (!fs.existsSync(tempPath)) {
    fs.mkdirSync(tempPath, { recursive: true });
}


export  const upload = multer({ storage: storage });



