import connectDB from "./db/index.js";
import {app} from "./app.js"

const port = process.env.PORT || 8000
connectDB()
.then(() => {
    app.listen(port, () => {
        console.log(`server is running at port ${port}`)
    })
})
.catch((err) => {
    console.log(`mongoDB connection Failed`, err)
})