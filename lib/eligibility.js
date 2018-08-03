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

const _ = require('lodash');

const _getEligibilityService = (context, modules) => {
  return new Promise((resolve, reject) => {
    const options = {
      useUserContext: false
    };
    const store = modules.dataStore(options);
    const eligibility = store.collection('oop-eligibility');
    const body = context.body;

    eligibility.save(body, (err, result) => {
      if (err) {
        return reject(err);
      } else if (result === undefined) {
        return reject(new Error('Eligibility data does not exist'));
      }
      if (result.summary === undefined) {
        return resolve([]);
      }
      
      const coverageLevel = (result !== undefined && result.coverage !== undefined && result.coverage.coinsurance !== undefined) ? result.coverage.coinsurance[0].coverage_level : null;
      const indDed = (result !== undefined !== undefined && result.summary !== undefined && result.summary.deductible !== undefined && result.summary.deductible.individual !== undefined) ? result.summary.deductible.individual.in_network.remaining.amount : null;
      const indOOP = (result !== undefined && result.summary !== undefined && result.summary.out_of_pocket !== undefined && result.summary.out_of_pocket.individual !== undefined) ? result.summary.out_of_pocket.individual.in_network.remaining.amount : null;
      const famDed = (result !== undefined && result.summary !== undefined && result.summary.deductible !== undefined && result.summary.deductible.family !== undefined) ? result.summary.deductible.family.in_network.remaining.amount : null;
      const famOOP = (result !== undefined && result.summary !== undefined && result.summary.out_of_pocket !== undefined && result.summary.out_of_pocket.family !== undefined) ? result.summary.out_of_pocket.family.in_network.remaining.amount : null;
      const indLimitOOP = (result !== undefined && result.summary !== undefined && result.summary.out_of_pocket !== undefined && result.summary.out_of_pocket.individual !== undefined) ? result.summary.out_of_pocket.individual.in_network.limit.amount : null;
      const famLimitOOP = (result !== undefined && result.summary !== undefined && result.summary.out_of_pocket !== undefined && result.summary.out_of_pocket.family !== undefined) ? result.summary.out_of_pocket.family.in_network.limit.amount : null;
      const indLimitDed = (result !== undefined && result.summary !== undefined && result.summary.deductible !== undefined && result.summary.deductible.individual !== undefined) ? result.summary.deductible.individual.in_network.limit.amount : null;
      const famLimitDed = (result !== undefined && result.summary !== undefined && result.summary.deductible !== undefined && result.summary.deductible.family) !== undefined ? result.summary.deductible.family.in_network.limit.amount : null;

      const deductibles = {
        coverage_level: coverageLevel,
        individual_remaining_deductible: indDed,
        individual_remaining_oop: indOOP,
        family_remaining_deductible: famDed,
        family_remaining_oop: famOOP,
        individual_limit_oop: indLimitOOP,
        family_limit_oop: famLimitOOP,
        individual_limit_deductible: indLimitDed,
        family_limit_deductible: famLimitDed
      };

      return resolve(deductibles);
    });
  });
};

exports.getDeductibles = (resource, context, modules, callback) => {
  _getEligibilityService(context, modules)
    .then((result) => {
      callback(null, result);
    })
    .catch((error) => {
      callback(error, null);
    });
};
