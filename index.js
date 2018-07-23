/**
 * Copyright (c) 2018 Kinvey Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */

const sdk = require('kinvey-flex-sdk');
const handlers = require('./lib/handlers');

//process.env.HTTP_PROXY = 'http://kvy-us1-proxy.kinvey.net:3128';
//process.env.HTTPS_PROXY = 'http://kvy-us1-proxy.kinvey.net:3128';

// Initiate the Flex SDK Service
sdk.service((err, flex) => {
  if (err) {
    console.log('Error initializing the Flex SDK, exiting.');
    throw err;
  }
  const data = flex.data;
  const flexFunctions = flex.functions;

  flexFunctions.register('getDeductibles', handlers.getDeductibles);
  flexFunctions.register('getCostData', handlers.getCostData);
  flexFunctions.register('getPlanData', handlers.getPlanData);
  flexFunctions.register('getBenefitData', handlers.getBenefitData);

  // Define Service Objects

  const oop = data.serviceObject('oop');

  const services = data.serviceObject('services');

  services.onGetAll(handlers.getAllServices);
  services.onGetById(handlers.getServiceById);
  services.onGetByQuery(handlers.getServiceByQuery);

  oop.onGetByQuery(handlers.getOopByQuery);
});
