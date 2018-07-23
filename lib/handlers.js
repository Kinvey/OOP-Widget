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

const oop = require('./oop-client');
const services = require('./services-client');
const transformers = require('./transformers');
const eligibility = require('./eligibility');
const cost = require('./cost-data');
const plan = require('./plan-data');
const benefit = require('./benefit-data');

/* This module contains the handlers for each flex data method.  Each handler:
 * 1) Makes a request to an external service via a client
 * 2) Transforms the result, if necessary
 * 3) Returns the result via the completion handler
 */

const _sendTransformedResponse = (entity, complete, modules) => {
  // const transformedEntity = transformers.transformEntity(entity, modules);
  const response = complete().setBody(entity);

  return response.ok().next();
};

const _get = (resource, id, complete, modules) => {
  services.get(resource, id, modules, (err, result) => {
    if (err) {
      const response = complete().setBody(err);
      
      return response.done();
    }
    // transform data if needed
    return _sendTransformedResponse(result, complete, modules);
  });
};

const _getAll = (resource, id, complete, modules) => {
  services.getAll(resource, id, modules, (err, result) => {
    if (err) {
      const response = complete().setBody(err);
      
      return response.done();
    }
    // transform data if needed
    return _sendTransformedResponse(result, complete, modules);
  });
};

const _search = (resource, query, complete, modules) => {
  services.search(resource, query, modules, (err, result) => {
    if (err) {
      const response = complete().setBody(err);

      return response.done();
    }
    // transform data if needed
    return _sendTransformedResponse(result, complete, modules);
  });
};


const _calculateOop = (resource, query, complete, modules) => {
  oop.calculateOop(resource, query, modules, (err, result) => {
    if (err) {
      const response = complete().setBody(err).runtimeError();

      return response.done();
    }
    // transform data if needed
    return _sendTransformedResponse(result, complete, modules);
  });
};

const _getDeductibles = (resource, context, complete, modules) => {
  eligibility.getDeductibles(resource, context, modules, (err, result) => {
    if (err) {
      const response = complete().setBody(err);
      
      return response.done();
    }
    // transform data if needed
    return _sendTransformedResponse(result, complete, modules);
  });
};

const _getCostData = (resource, context, complete, modules) => {
  cost.getCostData(resource, context, modules, (err, result) => {
    if (err) {
      const response = complete().setBody(err);
      
      return response.done();
    }
    // transform data if needed
    return _sendTransformedResponse(result, complete, modules);
  });
};

const _getPlanData = (resource, query, complete, modules) => {
  plan.getPlanData(resource, query, modules, (err, result) => {
    if (err) {
      const response = complete().setBody(err);
      
      return response.done();
    }
    // transform data if needed
    return _sendTransformedResponse(result, complete, modules);
  });
};

const _getBenefitData = (resource, query, complete, modules) => {
  benefit.getBenefitData(resource, query, modules, (err, result) => {
    if (err) {
      const response = complete().setBody(err);
      
      return response.done();
    }
    // transform data if needed
    return _sendTransformedResponse(result, complete, modules);
  });
};

const getAllServices = (context, complete, modules) => _getAll('Services', context.entityId, complete, modules);

const getServiceById = (context, complete, modules) => _get('Services', context.entityId, complete, modules);

const getServiceByQuery = (context, complete, modules) => _search('Services', context.query.query, complete, modules);

const getOopByQuery = (context, complete, modules) => _calculateOop('Oop', context.query.query, complete, modules);

const getDeductibles = (context, complete, modules) => _getDeductibles('Eligibility', context, complete, modules);

const getCostData = (context, complete, modules) => _getCostData('Cost', context.body.service_id, complete, modules);

const getPlanData = (context, complete, modules) => _getPlanData('Plan', context.query.query, complete, modules);

const getBenefitData = (context, complete, modules) => _getBenefitData('Benefit', context.query.query, complete, modules);

exports.getAllServices = getAllServices;
exports.getServiceById = getServiceById;
exports.getServiceByQuery = getServiceByQuery;

exports.getOopByQuery = getOopByQuery;

exports.getDeductibles = getDeductibles;
exports.getCostData = getCostData;
exports.getPlanData = getPlanData;
exports.getBenefitData = getBenefitData;
