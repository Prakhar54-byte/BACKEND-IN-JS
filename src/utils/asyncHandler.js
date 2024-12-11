// const asyncHandler = (requestHandler) => {
//     return (req, res, next) => {
//         console.log('req:', req, 'res:', res, 'next:', next); // Log the parameters
//         Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
//     };
// };

const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        console.log('req:', req, 'res:', res, 'next:', next); // Log the parameters
        if (typeof next !== 'function') {
            console.error('next is not a function');
        }
        Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err));
    };
};




export {asyncHandler}


// const asyncHandler= (fn) => async(req , res ,next) => {

//     try {
//         await fn(req, res,next);

//     } catch (error) {
//         res.status(error.status || 500).json({
//             success: false,
//             message: error.message || 'Internal Server Error'

//     });
// }  
/*
Higher-Order Function: asyncHandler is a function that takes another function fn as an argument.
Parameters and Return Value:(fn) => {}: This part defines a function that takes fn as a parameter.
() => {}: This part defines a function that takes no parameters and has an empty body.


*/


