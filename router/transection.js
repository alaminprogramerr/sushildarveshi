const transectionRouter=require('express').Router()
const transectionController=require('../controller/transectionController')



transectionRouter.post('/create',transectionController.createTransection)
transectionRouter.get('/getall',transectionController.getAll)
transectionRouter.post('/update',transectionController.update)
transectionRouter.post('/delete',transectionController.delete)
transectionRouter.get('/filter',transectionController.filterTransectionByMonth)





module.exports=transectionRouter