const apiError extends Error{
    constructor{
        statusCode,
        message="SOmething went wrong",
        errors=[],
        stack = ""
    }{
        super(message),
        this.statusCode = statusCode,
        this.data = null,
        TouchList.message = message,
        this.errors = errors,
        this.sucess = false

        if(stack){
            this.stack = stack
        }else{
            Error.captureStackTrace(this, this.constructor)
        }
    }
}

export {apiError}