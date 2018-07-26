// /**
//  * Copyright (c) 2018 Kinvey Inc.
//  *
//  * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
//  * in compliance with the License. You may obtain a copy of the License at
//  *
//  *     http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software distributed under the License
//  * is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
//  * or implied. See the License for the specific language governing permissions and limitations under
//  * the License.
//  */


// Collection "cost" is the raw cost table in KDS as imported as CSV into the system 
//     (might be part of admin console at some point)
// Collection "services" is a flexdata endpoint pointing to "createServicesList".
// - only supported operation is GetAll
// - will get all rows from the "cost" KDS, and apply a field filter list to only
//   return those fields that are relevant to the front-end


// if the datamodel of the XLS sheet changes, fix the first column. Second column
// is the field names of the object that the mobile app expects, do not change that
const servicesFields = {
  _id: '_id', 
  _acl: '_acl',
  _kmd: '_kmd',
  Service: 'service',
  Keywords: 'keywords' 
};

const createServicesList = (query, modules) => {
  return new Promise((resolve, reject) => {
    const options = {
      useUserContext: false
    };
    const store = modules.dataStore(options);
    const config = store.collection('oop-service-cost');
  
    config.find(null, (err, result) => {
      if (err) {
        reject(err);
      } else if (result === undefined || result[0] === undefined) {
        reject(new Error('Error getting service list'));
      }
      // only return those fields that the app needs to display the Service list in the front-end
      const serviceArray = [];
      result.forEach((kdsItem) => {
        const service = {};
        for (const key in servicesFields) {
          service[servicesFields[key]] = kdsItem[key];
        }
        serviceArray.push(service);
      });
      resolve(serviceArray);
    });
  });
};

const _getService = (query, modules) => {
  return new Promise((resolve, reject) => {
    const options = {
      useUserContext: false
    };
    const store = modules.dataStore(options);
    const config = store.collection('oop-service-cost');
    const query = new modules.Query();
  
    console.log("returning all records as-is from KDS collection 'service-cost'");
    config.find(query, (err, result) => {
      if (err) {
        reject(err);
      } else if (result === undefined || result[0] === undefined) {
        reject(new Error('Service does not exist'));
      }
      resolve(result);
    });
  });
};

exports.getAll = (resource, item, modules, callback) => {
  createServicesList(null, modules).then((result) => {
    callback(result);
  });
};

exports.get = (resource, item, modules, callback) => {
  _getService(null, modules).then((result) => {
    callback(result);
  });
};

exports.search = (resource, item, modules, callback) => {
  _getService(null, modules).then((result) => {
    callback(result);
  });
};

