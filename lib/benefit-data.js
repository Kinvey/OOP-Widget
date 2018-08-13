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

const _getBenefitDataService = (query, modules) => {
  return new Promise((resolve, reject) => {
    const options = {
      useUserContext: false
    };
    const store = modules.dataStore(options);
    const benefit = store.collection('plan-benefit');
    const kdsQuery = new modules.Query();
    
    kdsQuery.equalTo('provider', query.provider)
      .equalTo('planID', query.planID)
      .equalTo('benefitKey', query.benefitKey);

    benefit.find(kdsQuery, (err, result) => {
      if (err) {
        return reject(err);
      } else if (result === undefined || result[0] === undefined) {
        return reject(new Error(`Benefit data does not exist for ${query.provider}, ${query.planID}, ${query.benefitKey}`));
      } else if (result.length !== 1) {
        return reject(new Error(`Found more than one row for service in Benefit Table for ${query.provider}, ${query.planID}, ${query.benefitKey}`));
      }
      const rv = {
        allowed_amount: query.allowed_amount,
        benefitType: result[0].benefitType,
        type: result[0].valueType,  
        value: result[0].value
      };
      return resolve(rv);
    });
  });
};

exports.getBenefitData = (resource, query, modules, callback) => {
  _getBenefitDataService(query, modules)
    .then((result) => {
      callback(null, result);
    })
    .catch((error) => {
      callback(error, null);
    });
};
