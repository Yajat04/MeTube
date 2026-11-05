const asyncHandler = (requestHandler) => {
    return (req, res, next) => { //returns what the requesthan=ndler(like userReg controller) return with added functionality of promise check, thererfore no need to return in the controller ft 
    Promise.resolve(requestHandler(req, res, next))
    .catch((err) => next(err))
    }
}

export {asyncHandler}