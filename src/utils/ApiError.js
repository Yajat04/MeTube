//File required to make custom error handlings, track errors etc

class ApiError extends Error{ //to use properties of error class like statuscode etc we need to inherit it
    constructor(
        statusCode,
        message = "something went wrong",
        errors = [],
        stack = ""
    ){
        super(message) //error class (parent) is invoked with the error msg only
        this.statusCode = statusCode
        this.message = message
        this.errors = errors
        this.data = null
        this.success = false
        
        if(stack){
            this.stack = stack
        } else{
            Error.captureStackTrace(this, this.constructor) //stack tracks the error record
        }
    }
}

export {ApiError}
