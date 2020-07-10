/*jshint esversion: 6 */
/*jshint esversion: 8 */
const Tour = require('./../models/tourModel');
const Booking = require('./../models/bookingModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


/* documentation:
   #1 :
   https://stripe.com/docs/api/checkout/sessions/create?lang=node#create_checkout_session-line_items
*/

exports.getCheckoutSession = catchAsync(async (req, res, next) => {


  // 1) Get the currently booked tour
  const tour = await Tour.findById(req.params.tourId);
  console.log(tour);


  // 2) Create checkout session
  const session = await stripe.checkout.sessions.create({

    // === required parameters(properties) ====
    payment_method_types: ['card'],
    // (not secure)
    success_url: `${req.protocol}://${req.get('host')}/?tour=${req.params.tourId}&user=${req.user.id}&price=${tour.price}`, // *_url is the page for redirecting the user to after payment is successful

    cancel_url: `${req.protocol}://${req.get('host')}/tours/${tour.slug}`,

    //Property: "line_items" is an Array contains details and info about current product
    line_items: [
      // Use key and value in obj argument to input details
      // ref:  https://stripe.com/docs/api/checkout/sessions/create?lang=node#create_checkout_session-line_items
      {
        name: `${tour.name} Tour`,
        description: tour.summary,
        images: [`${req.protocol}://${req.get('host')}/img/tours/${tour.imageCover}`], // ex: http://localhost/img/tours/1.jpg
        amount: tour.price * 100, // Convert value to dollar. One dollarcents * 100
        currency: 'aud',
        quantity: 1,
      },
    ],
    mode: 'payment',

    // ==== optional parameters(properties)
    // To create a new booking
    client_reference_id: req.params.tourId,


  });

  // 3) Create session in response
  res.status(200).json({
    status: 'success',
    messageFromServer: 'The session data below is generated by "stripe" package in "booking controller" which is triggered by router for booking process at /api/v1/bookings/checkout-session as server-side API end-point',
    session: session,
  });


});


//
exports.createBookingCheckout = catchAsync(async (req, res, next) => {

  const {
    tour,
    user,
    price
  } = req.query;

  if (!tour || !user || !price) return next();
  /* In viewsRoutes.js:
           router.get('/',
      //==>   bookingController.createBookingCheckout,
              authController.isLoggedIn,
              viewsController.getOverview);
  */

  //
  await Booking.create({
    tour,
    user,
    price
  });

  // ${req.protocol}://${req.get('host')}

  /*
  After booking is successful, stripe will redirect user to a URL has request with query string which has data to be sent to this middleware  "createBookingCheckout" to create new Booking data.

  In order to protect data, redirect user again in this middleware so the data in query string won't be revealed
*/
  res.redirect(req.originalUrl.split('?')[0]);

  next();


});
