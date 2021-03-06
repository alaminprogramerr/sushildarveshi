const express = require('express')
const app = express()
const PORT = process.env.PORT || 5000
const mongoos = require('mongoose')
const bodyParser = require('body-parser')
const cors = require('cors')
const multer = require('multer')
const mailer = require('./mailer')
const userRouter = require('./router/userRouter')
const path = require('path')
const userModel = require('./model/userModel')
var XLSX = require('xlsx');
const Product = require('./model/Product')
const ProductGroupModel = require('./model/ProductGroupModel')
const ProductCatalogModel = require('./model/ProductCatalogModel')
const ProductRouter =require('./router/productRouter')
const morgan =require('morgan')


app.use(morgan('dev'))
app.use(cors())
app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())


const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './client/uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now().toString() + file.originalname)
    }
})

const storage2 = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, './uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now().toString() + file.originalname)
    }
})

const upload = multer({ storage: storage })
const upload2 = multer({ storage: storage2 })



app.use(userRouter)
app.use(ProductRouter)
app.post('/send-email', upload2.single('file'), (req, res) => {
    mailer(
        req.body.from,
        req.body.to.split(','),
        req.body.subject,
        req.body.massage,
        req.file.filename,
        res
    )
})

app.post('/uploadPP', upload.single('file'), (req, res) => {
    userModel.findOne({ _id: req.body.uid })
        .then(user => {
            user.pp = req.file.filename
            user.save()
                .then(user => {
                    res.status(200).json(user)
                })
                .catch(err => {
                    return res.status(500).json({ message: "Server error occurd " })
                })
        })
        .catch(err => {
            console.log(err);
        })
})

app.post('/upload-product', upload2.single('file'), (req, res) => {
    var workbook = XLSX.readFile(`./uploads/${req.file.filename}`, { cellDates: true });
    var sheet_name_list = workbook.SheetNames;
    let result = XLSX.utils.sheet_to_json(workbook.Sheets[sheet_name_list[0]])
    async function importToDB() {
        let pushDb = result.map(async element => {
            
            if(!element['Product Code'] || !element['Product Group Code'] ||  !element.CatalogCode){
                console.log('not added ');
                // return res.sendStatus(400)
            }else{
            await new Product({
                productCode: element['Product Code'],
                description: element.Description,
                productGroupCode: element['Product Group Code'],
                MOQ: element.MOQ,
                status: element.Status,
                catalogCode: element.CatalogCode
            })
                .save()
                .then(doc => {
                    console.log('added');
                })
                .catch(err => {
                    return console.log(err);
                })
            }
        })
        await Promise.all(pushDb)
        ProductGroupModel.findOne()
            .then(doc => {
                let existingGroup = doc.productGroup
                let updatedGroup = [...existingGroup]
                function mapAndPush() {
                    result.map(async el => {
                        if (updatedGroup.findIndex(group => (el['Product Group Code'] === group.groupName)) === -1) {
                            console.log('pushed');
                            updatedGroup.push({ groupName: el['Product Group Code'], description: '' })
                        } else {
                            // console.log('existing group');
                        }
                    })
                    ProductGroupModel.findOne()
                        .then(doc => {
                            doc.productGroup = updatedGroup
                            doc.save()
                                .then(updated => {
                                    // return console.log(updated);
                                })
                                .catch(err => {
                                    return console.log(err);
                                })
                        })

                        .catch(err => {
                            return console.log(err);
                        })
                }
                mapAndPush()
            })
            .catch(err => {
                return console.log(err);
            })
            
        ProductCatalogModel.findOne()
        .then(doc => {
            let existingcatalog = doc.catalog
            let updatedcatalog = [...existingcatalog]

            function mapAndPushCatalog() {
                result.map(async el => {
                    if (updatedcatalog.findIndex(catalog => (el.CatalogCode === catalog.catalogName)) === -1) {
                        updatedcatalog.push({ catalogName: el.CatalogCode, description: '' })
                    } else {
                        console.log('existing catalog');
                    }
                })
                ProductCatalogModel.findOne()
                    .then(doc => {
                        doc.catalog = updatedcatalog
                        doc.save()
                            .then(updated => {
                                return console.log(updated);
                            })
                            .catch(err => {
                                return console.log(err);
                            })
                    })

                    .catch(err => {
                        return console.log(err);
                    })
            }
            mapAndPushCatalog()
        })
        .catch(err => {
            return console.log(err);
        })

    }
    importToDB()
    return res.status(200).json({ message: "Product Uploaded" })

})

app.use("/uploads", express.static("uploads"));

app.use(express.static(path.join(__dirname, './client/build')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, './client/build/index.html'));
});

app.listen(PORT, (req, res) => {
    console.log('Server started on port ', PORT)
    // mongoos.connect('mongodb+srv://user:user@mern.a77ou.mongodb.net/loadapplication?retryWrites=true&w=majority', { useFindAndModify: false, useUnifiedTopology: true, useNewUrlParser: true }, (err => {
    mongoos.connect('mongodb://localhost/material-business', { useFindAndModify: false, useUnifiedTopology: true, useNewUrlParser: true }, (err => {
        if (err) {
            console.log(err)
            return
        }
        console.log('Mongodb  connected')
        ProductGroupModel.find()
            .then(groups => {
                if (groups.length < 1) {
                    new ProductGroupModel({})
                        .save()
                        .then(doc => {
                            console.log('created group');
                        })
                        .catch(err => {
                            console.log(err);
                        })
                }
            })
            .catch(err => {
                console.log(err);
            })

        ProductCatalogModel.find()
            .then(catalog => {
                if (catalog.length < 1) {
                    new ProductCatalogModel({})
                        .save()
                        .then(doc => {
                            console.log('created group');
                        })
                        .catch(err => {
                            console.log(err);
                        })
                }
            })
            .catch(err => {
                console.log(err);
            })
    }))
})

