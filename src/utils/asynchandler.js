
const asyncHandler = (requestHandler) => {
return (req, res, next) => {
    Promise.resolve(requestHandler(req, res, next)).catch((err) => next(err)) 
}
}

export { asyncHandler }


//In this asyncHandler, any error that happens inside the route is caught using Promise.resolve(...).catch(...), and next(err) is called — which sends the error to Express’s error-handling middleware. Express will then skip the rest and jump directly to the error handler.