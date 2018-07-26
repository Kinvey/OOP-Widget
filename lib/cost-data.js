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

const _getCostDataService = (id, modules) => {
  return new Promise((resolve, reject) => {
    const options = {
      useUserContext: false
    };
    const store = modules.dataStore(options);
    const cost = store.collection('oop-service-cost');

    cost.findById(id, (err, result) => {
      if (err) {
        return reject(new Error('Cannot find this service'));
      } else if (result === undefined || result === {}) {
        return reject(new Error('Cost data does not exist'));
      }

      const costdata = {
        benefitKey: result.BenefitKey,
        episode: result.Episode,
        episodeDesc: result.EpisodeDesc,
        POS: result.POS,
        service: result.Service,
        allowed_amount: [
          { label: 'Low', value: result.LowAmt },
          { label: 'Average', value: result.AvgAmt },
          { label: 'High', value: result.HighAmt }
        ]
      };
      return resolve(costdata);
    });
  });
};

const _getAllCostDataService = (query, modules) => {
  return new Promise((resolve, reject) => {
    const options = {
      useUserContext: false
    };
    const store = modules.dataStore(options);
    const benefit = store.collection('oop-service-cost');
    const kdsQuery = new modules.Query();
    if (query._id !== '') {
      kdsQuery
        .equalTo('_id', query._id)
        .ascending('Encouter')
        .ascending('ServiceOrder');
    } else if (query._id === '' && query.category === '') {  
      kdsQuery
        .equalTo('Episode', query.episode)
        .ascending('Encouter')
        .ascending('ServiceOrder');
    } else if (query._id === '' && query.category !== '' && query.category !== '') {    
      kdsQuery
        .equalTo('Episode', query.episode)
        .equalTo('EpisodeCategory', query.category)
        .ascending('Encouter')
        .ascending('ServiceOrder');
    }
    benefit.find(kdsQuery, (err, result) => {
      if (err) {
        return reject(err);
      } else if (result === undefined || result[0] === undefined) {
        return reject(new Error('Cost data does not exist'));
      }
      return resolve(result);
    });
  });
};

exports.getCostData = (resource, id, modules, callback) => {
  _getCostDataService(id, modules)
    .then((result) => {
      callback(null, result);
    })
    .catch((error) => {
      callback(error, null);
    });
};

exports.getAllCostData = (resource, query, modules, callback) => {
  _getAllCostDataService(query, modules)
    .then((result) => {
      callback(null, result);
    })
    .catch((error) => {
      callback(error, null);
    });
};
