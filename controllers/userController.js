/*jshint esversion: 6 */
/*jshint esversion: 8 */
const User = require('./../models/userModel');
const APIFeatures = require('./../utils/apiFeatures'); // using class APIFeatures
const catchAsync = require('./../utils/catchAsync'); // using function catchAsync
const AppError = require('./../utils/appError'); // using function catchAsync
const factory = require('./handlerFactory'); //exports.deleteOne = Model => catchAsync(async (req, res, next) => { ...


const filterObj = (obj, ...allowedFields) => {
  // in function: exports.updateMe , const filteredBody = filterObj(req.body, 'name', 'email');
  const newObj = {};

  Object.keys(obj).forEach(propertyInObj => {
    //Object.keys(object1) return an array of all object's property names (as propertyInObj)

    //If the propertyInObj is included the allowedFields array , ex: 'name' , 'email'
    if (allowedFields.includes(propertyInObj)) {
      //allowedFields is array: ['name', 'email']

      //Then assign the obj's property and value that has been "filtered" to newObj object
      newObj[propertyInObj] = obj[propertyInObj];
    }

  });

  return newObj;
};

//
// 2) ============== ROUTE-HANDLERS ==============

//
exports.getAllUsers = factory.getAll(User);
/*password field is set not to be shown in userModel.js:
password: {
  type: String,
  required: [true, 'Please provide a password'],
  minlength: 6,
  maxlength: 12,
  select: false, // won't be shown in results
},
use:
const users = await User.find();
*/

//
exports.getMe = (req, res, next) => {
  // Get req.user.id property from previous middle ware (authController.protect) from the route controller.catch.
  // Then assign req.user.id to req.params.id to give req.params.id and new property which is going to be used in next middl ware funcion (userController.getUser)
  req.params.id = req.user.id;
  next();
};

// for updating user's data except for password related fields
// function is used by router.patch('/updateMe', userController.updateMe); in routes/userRoutes.js
// and used by js/updateSettings.js
exports.updateMe = catchAsync(async (req, res, next) => {

  console.log("\x1b[32m" + "\n-- The req.body for updating user from \n  with updateSettings.js using API (PATCH request): \n" + "\x1b[0m");
  console.log("  (function location: userController.updateMe used by routes/viewRoutes.js)\n");
  console.log(req.body);

  // for file uploading
  if (req.file) {
    console.log("\x1b[32m" + "\n  -- The req.file for uploading file\n" + "\x1b[0m");
    console.log(req.file);
    console.log("\x1b[32m" + "\n\n" + "\x1b[0m");
    /* the log example:
      {
        fieldname: 'photo',
        originalname: 'default - Copy.jpg',
        encoding: '7bit',
        mimetype: 'image/jpeg',
        destination: 'public/img/users',
        filename: 'cdefddfaef9231c10511d70a0ea20bfb',
        path: 'public\\img\\users\\cdefddfaef9231c10511d70a0ea20bfb',
        size: 14088
      }
    */

  }

  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(new AppError('This route is not for password updates. Please use /updateMyPassword', 400));
  }

  // 2) Use function:  const filterObj = (obj, ...allowedFields) => { ... to filter out the fields that are not allowed to be updated
  // ...allowedFields is 'name', 'email'
  const filteredBody = filterObj(req.body, 'name', 'email', 'photo');

  // 3) Update the user document : findByIdAndUpdate(id, Obj for data, Obj for options)
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true,

    //ref:  https://mongoosejs.com/docs/api.html#model_Model.findByIdAndUpdate
    //options: #1 runValidators: if true, runs update validators on this command. Update validators validate the update operation against the model's schema.
    //options: #2 new: bool - true to return the modified document rather than the original. defaults to false
    //will trigger the isNew property and userSchema.pre('save', function(next) { for process new document

    // Obj.keys and Array.includes
    // https://codepen.io/avgsteve/pen/XWXKrNz?editors=0011
  });

  //
  res.status(200).json({
    status: 'success',
    message: 'The user\'s data has been updated by PATCH req with userController.updateMe in userRoutes.js',
    data: updatedUser
  });

  console.log("\n -- res.locals:");
  console.log(res.locals);

  console.log("\n -- res.message:");
  console.log(res.locals);

  console.log("\n" + "\x1b[32m" + "-- End of the log for updating user from form (class='form-user-data') : \n" + "\x1b[0m");

});

exports.deleteMe = catchAsync(async (req, res, next) => {
  //find a user by id and set field: active to false
  await User.findByIdAndUpdate(req.user.id, {
    active: false
  });

  res.status(204).json({
    status: 'success',
    data: null
  });


});

//route middle ware for SINGLE user route, ex: router.route('/:id').get(userController.getUser)
exports.getUser = factory.getOne(User);

exports.createUser = (req, res) => {
  // 500 Internal Server Error
  res.status(500).json({
    status: 'error',
    message: 'This route /createUser is not yet defined! Please use /signup instead!'
  });
};

//update user data from DB (via route:  router.route('/:id').patch(authController.protect, userController.updateMe))
exports.updateUser = factory.updateOne(User);

//delete user data from DB (via route:  route('/:id').delete(userController.deleteUser);)
exports.deleteUser = factory.deleteOne(User);
