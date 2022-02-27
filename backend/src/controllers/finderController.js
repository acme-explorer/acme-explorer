import { StatusCodes } from 'http-status-codes';
import Constants from '../shared/constants.js';
import { finderModel } from '../models/finderModel.js';
import { tripModel } from '../models/tripModel.js';
import { configurationModel } from '../models/configurationModel.js';
import { RecordNotFound } from '../shared/exceptions.js';
import { redis } from '../config/redis.js';

export const findAllFinders = async (req, res) => {
  let { perPage, page, sort, ...query } = req.query;
  const [field, sortType] = sort ? sort.split(',') : Constants.defaultSort;
  perPage = perPage ? parseInt(perPage) : Constants.defaultPerPage;
  page = Math.max(0, page ?? 0);

  try {
    const records = await finderModel
      .find(query)
      .skip(perPage * page)
      .limit(perPage)
      .sort({ [field]: sortType })
      .exec();
    const count = await finderModel.countDocuments();
    res.json({
      records: records,
      page: page,
      pages: count / perPage
    });
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).send(e.message);
  }
};

export const findFinder = async (req, res, next) => {
  try {
    const record = await finderModel.findById(req.params.finderId);

    if (!record) {
      return next(new RecordNotFound());
    }

    res.json(record);
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(e);
  }
};

export const createFinder = async (req, res) => {
  const newFinder = new finderModel(req.body);

  try {
    const finder = await newFinder.save();
    res.status(StatusCodes.CREATED).json(finder);
  } catch (e) {
    if (e) {
      if (e.name === 'ValidationError') {
        res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(e);
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(e);
      }
    }
  }
};

export const updateFinder = async (req, res) => {
  try {
    const finder = await finderModel.findOneAndUpdate({ _id: req.params.finderId }, req.body, { new: true });
    res.json(finder);
  } catch (e) {
    if (e) {
      if (e.name === 'ValidationError') {
        res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(e);
      } else {
        res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(e);
      }
    }
  }
};

export const deleteFinder = async (req, res) => {
  try {
    await finderModel.deleteOne({ _id: req.params.finderId });
    res.sendStatus(StatusCodes.NO_CONTENT);
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(e);
  }
};

export const findFinderTrips = async (req, res, next) => {
  try {
    const record = await finderModel.findById(req.params.finderId);

    if (!record) {
      return next(new RecordNotFound());
    }

    const query = record.toJSON();
    const key = JSON.stringify(query);

    const cacheValue = await redis.get(key);
    let result;
    if (cacheValue) {
      result = JSON.parse(cacheValue);
    } else {
      const redisConfig = await configurationModel.getRedisConfig();
      const $query = {
        ...(query.keyword ? { $or: [{ title: query.keyword }, { description: query.keyword }] } : {}),
        ...(query.minPrice || query.maxPrice
          ? {
              price: {
                $gte: query.minPrice || 0,
                $lte: query.maxPrice || Constants.maxPrice
              }
            }
          : {}),
        ...(query.startDate ? { startDate: query.startDate } : {}),
        ...(query.endDate ? { endDate: query.endDate } : {})
      };

      result = await tripModel.find($query).limit(redisConfig.maxResultsFinder || Constants.maxResultsFinder);
      if (result) {
        await redis.set(key, JSON.stringify(result), {
          EX: redisConfig.timeCachedFinder || Constants.timeCachedFinder
        });
      }
    }
    res.json(result);
  } catch (e) {
    res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(e.message);
  }
};