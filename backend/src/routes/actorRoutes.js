import {
  find_all_actors,
  create_an_actor,
  find_an_actor,
  update_an_actor,
  delete_an_actor
} from '../controllers/actorController.js';

export const actorRoutes = (app) => {
  /**
   * Post an actor
   *    RequiredRoles: None
   *
   * @section actors
   * @type get post
   * @url /v1/actors
   * @param {string}
   */
  app.route('/v1/actors').get(find_all_actors).post(create_an_actor);

  /**
   * Put an actor
   *    RequiredRoles: to be the proper actor
   * Get an actor
   *    RequiredRoles: to be the proper actor or an Administrator
   *
   * @section actors
   * @type get put
   * @url /v1/actors/:actorId
   */
  app.route('/v1/actors/:actorId').get(find_an_actor).put(update_an_actor).delete(delete_an_actor);
};
