module.exports = EventListenerTree;

/**
 * Construct a tree root when invoked without any arguments. Children nodes are
 * constructred internally as needed on calls to addListener()
 *
 * @param {EventListenerTree} [parent]
 * @param {string} [segment]
 */
function EventListenerTree(parent, segment) {
  this.parent = parent;
  this.segment = segment;
  this.children = null;
  this.listeners = null;
}

/**
 * Remove the reference to this node from its parent so that it can be garbage
 * collected. This is called internally when all listeners to a node
 * are removed
 */
EventListenerTree.prototype._destroy = function() {
  // For all non-root nodes, remove the reference to the node
  if (this.parent) {
    removeChild(this.parent, this.segment);
  // For the root node, reset any references to listeners or children
  } else {
    this.children = null;
    this.listeners = null;
  }
};

/**
 * Get a node for a path if it exists
 *
 * @param  {string[]} segments
 * @return {EventListenerTree|undefined}
 */
EventListenerTree.prototype._getChild = function(segments) {
  var node = this;
  for (var i = 0; i < segments.length; i++) {
    var segment = segments[i];
    node = node.children && node.children[segment];
    if (!node) return;
  }
  return node;
};

/**
 * If a path already has a node, return it. Otherwise, create the node and
 * ancestors in a lazy manner. Return the node for the path
 *
 * @param  {string[]} segments
 * @return {EventListenerTree}
 */
EventListenerTree.prototype._getOrCreateChild = function(segments) {
  var node = this;
  for (var i = 0; i < segments.length; i++) {
    var segment = segments[i];
    if (!node.children) {
      node.children = {};
    }
    var node = node.children[segment] ||
      (node.children[segment] = new EventListenerTree(node, segment));
  }
  return node;
};

/**
 * Add a listener to a path location. Listener should be unique per path
 * location, and calling twice with the same segments and listener value has no
 * effect. Unlike EventEmitter, listener may be any type of value
 *
 * @param {string[]} segments
 * @param {*} listener
 */
EventListenerTree.prototype.addListener = function(segments, listener) {
  var node = this._getOrCreateChild(segments);
  if (node.listeners) {
    var i = node.listeners.indexOf(listener);
    if (i === -1) {
      node.listeners.push(listener);
    }
  } else {
    node.listeners = [listener];
  }
};

/**
 * Remove a listener from a path location
 *
 * @param {string[]} segments
 * @param {*} listener
 */
EventListenerTree.prototype.removeListener = function(segments, listener) {
  var node = this._getChild(segments);
  if (!node || !node.listeners) return;
  if (node.listeners.length === 1) {
    if (node.listeners[0] === listener) {
      node.listeners = null;
      if (!node.children) {
        node._destroy();
      }
    }
    return;
  }
  var i = node.listeners.indexOf(listener);
  if (i > -1) {
    node.listeners.splice(i, 1);
  }
};

/**
 * Remove all listeners and descendent listeners for a path location
 *
 * @param {string[]} segments
 */
EventListenerTree.prototype.removeAllListeners = function(segments) {
  var node = this._getChild(segments);
  if (node) {
    node._destroy();
  }
};

/**
 * Return direct listeners to `segments`
 *
 * @param  {string[]} segments
 * @return {Array} listeners
 */
EventListenerTree.prototype.getListeners = function(segments) {
  var node = this._getChild(segments);
  return (node && node.listeners) ? node.listeners.slice() : [];
};

/**
 * Return an array with each of the listeners that may be affected by a change
 * to `segments`. These are:
 *   1. Listeners to each node from the root to the node for `segments`
 *   2. Listeners to all descendent nodes under `segments`
 *
 * @param  {string[]} segments
 * @return {Array} listeners
 */
EventListenerTree.prototype.getAffectedListeners = function(segments) {
  var listeners = [];
  var node = pushAncestorListeners(listeners, segments, this);
  if (node) {
    pushDescendantListeners(listeners, node);
  }
  return listeners;
};

/**
 * Return an array with each of the listeners to descendent nodes, not
 * including listeners to `segments` itself
 *
 * @param  {string[]} segments
 * @return {Array} listeners
 */
EventListenerTree.prototype.getDescendantListeners = function(segments) {
  var listeners = [];
  var node = this._getChild(segments);
  if (node) {
    pushDescendantListeners(listeners, node);
  }
  return listeners;
};

/**
 * Push direct listeners onto the passed in array
 *
 * @param {Array} listeners
 * @param {EventListenerTree} node
 */
function pushListeners(listeners, node) {
  if (!node.listeners) return;
  for (var i = 0, len = node.listeners.length; i < len; i++) {
    listeners.push(node.listeners[i]);
  }
}

/**
 * Push listeners for each ancestor node and the node at `segments` onto the
 * passed in array. Return the node at `segments` if it exists
 *
 * @param  {Array} listeners
 * @param  {string[]} segments
 * @param  {EventListenerTree} node
 * @return {EventListenerTree|undefined}
 */
function pushAncestorListeners(listeners, segments, node) {
  pushListeners(listeners, node);
  for (var i = 0; i < segments.length; i++) {
    var segment = segments[i];
    node = node.children && node.children[segment];
    if (!node) return;
    pushListeners(listeners, node);
  }
  return node;
}

/**
 * Push listeners for each of the node's children and their recursive children
 * onto the passed in array
 *
 * @param {Array} listeners
 * @param {EventListenerTree} node
 */
function pushDescendantListeners(listeners, node) {
  if (!node.children) return;
  for (var key in node.children) {
    var child = node.children[key];
    pushListeners(listeners, child);
    pushDescendantListeners(listeners, child);
  }
}

/**
 * Remove the child at the specified segment from a node. Also recursively
 * remove parent nodes if there are no remaining dependencies
 *
 * @param {EventListenerTree} node
 * @param {string} segment
 */
function removeChild(node, segment) {
  // Remove reference this node from its parent
  if (hasOtherKeys(node.children, segment)) {
    delete node.children[segment];
    return;
  }
  node.children = null;

  // Destroy parent if it no longer has any dependents
  if (!node.listeners) {
    node._destroy();
  }
}

/**
 * Return whether the object has any other property key other than the
 * provided value.
 *
 * @param  {Object} object
 * @param  {string} ignore
 * @return {Boolean}
 */
function hasOtherKeys(object, ignore) {
  for (var key in object) {
    if (key !== ignore) return true;
  }
  return false;
}