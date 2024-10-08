const asyncHandler = (requestHandler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandler(req, res, next))
        .catch((err) => next(err));
    }
}




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



export { asyncHandler };