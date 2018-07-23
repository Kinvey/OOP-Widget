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

const _getPlanDataService = (query, modules) => {
  return new Promise((resolve, reject) => {
    const options = {
      useUserContext: false
    };
    const store = modules.dataStore(options);
    const plan = store.collection('health-plan');
    const kdsQuery = new modules.Query();
    kdsQuery.equalTo('name', query.planName)
      .equalTo('planID', query.planId);

    plan.find(kdsQuery, (err, result) => {
      if (err) {
        return reject(err);
      } else if (result === undefined || result[0] === undefined) {
        return reject(new Error('Plan data does not exist'));
      } else if (result.length !== 1) {
        return reject(new Error('Found more than one row for service in Plan data'));
      }
      const rv = {
        provide: result[0].provider, 
        product: result[0].product,
        oopMaxMember: result[0].oopMaxMember,
        oopMaxSpouse: result[0].oopMaxSpouse,
        oopMaxSubscriber: result[0].oopMaxSubscriber
      };
      return resolve(rv);
    });
  });
};

exports.getPlanData = (resource, query, modules, callback) => {
  _getPlanDataService(query, modules)
    .then((result) => {
      callback(null, result);
    })
    .catch((error) => {
      callback(error, null);
    });
};
