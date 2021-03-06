
describe("ReactTHREE composite components", function() {
  var Scene = React.createFactory(ReactTHREE.Scene);
  var Object3D = React.createFactory(ReactTHREE.Object3D);
  var Mesh = React.createFactory(ReactTHREE.Mesh);
  var PerspectiveCamera = React.createFactory(ReactTHREE.PerspectiveCamera);
  
  var mountpoint = null;

  beforeEach(function() { mountpoint = createTestFixtureMountPoint(); });
  afterEach(function() { removeTestFixtureMountPoint(mountpoint); });


  it("correctly replaces PIXI objects instead of setting HTML markup when replacing components in-place", function() {

    //
    // This occurs when a composite element is updated in-place. To create this (admittedly uncommon)
    // situation we create a composite component that changes the key of its child while everything else
    // (including the key of the composite element) remains unchanged.  In this case _updateChildren in ReactMultiChildMixin
    // will update in-place and then updateComponent in ReactCompositeComponentMixin will try to nuke and replace the child
    // component since the keys don't match.
    //
    var injectedKeyComponent = React.createClass({
      displayName: 'injectedKeyComponent',
      render: function () {
        var propswithkey = _.clone(this.props);
        propswithkey.key = this.props.injectedkey;
        return Object3D(propswithkey);
      }
    });
    var injectedKeyFactory = React.createFactory(injectedKeyComponent);

    var injectedKeyStage = React.createClass({
      displayName: 'injectedKeyStage',
      render: function () {
        return Scene({width:this.props.width, height:this.props.height, ref:'scene'},
        injectedKeyFactory({x:100, y:100, key: 'argh', injectedkey:this.props.injectedkey}));
      }
    });
    var injectedKeyStageFactory = React.createFactory(injectedKeyStage);

    // generate two sets of props, identical except that they contain different
    // values of injectedkey.

    var baseprops = {width:300, height:300, key:'argh'};
    var addinjectedkey = function(originalprops, injectedkey) {
      var newprops = _.clone(originalprops);
      newprops.injectedkey = injectedkey;
      return newprops;
    };
    var props1 = addinjectedkey(baseprops, 'one');
    var props2 = addinjectedkey(baseprops, 'two');

    //
    // render with the original set of props, then again with a new injected key.
    // this should keep the same injectedKeyComponent instance but force React to
    // replace the Object3D inside of injectedKeyComponent. If we
    // don't switch to a different key then React will just update the current instance
    // of Object3D instead of trying to replace it.
    //
    var reactinstance = React.render(injectedKeyStageFactory(props1),mountpoint);

    // this should destroy and replace the child instance instead of updating it
    reactinstance.setProps(props2);

    expect(mountpoint.childNodes.length).toBe(1);
    expect(mountpoint.childNodes[0].nodeName).toBe('CANVAS');

    // the tree from here on down is three.js objects, not DOM nodes
    expect(mountpoint.childNodes[0].childNodes.length).toBe(0);

    // examine the three.js objects
    var scene = reactinstance.refs['scene']._THREEObject3D;
    expect(scene.children.length).toBe(1);
  });

  it ("correctly replaces owned components", function() {
    // if a composite component switches its child (the root component
    // that is returned by the render method) it should remove the old
    // child and add the new child. This also requires doing the same
    // thing to the parallel tree used by three.js. But since the composite
    // itself itsn't part of three.js scene graph this can get tricky.
    var changedChildComponent = React.createClass({
      displayName:'changeChildComponent',
      render: function () {
        var compositechild = this.props.renderstate;
        if (this.props.thingindex === 1) {
          return Object3D({text:'oldtext',key:1});
        } else {
          return PerspectiveCamera({key:2});
        }
      }
    });
    var changedChildSceneFactory = React.createFactory(React.createClass({
      render: function() {
        return Scene({width:300,height:300,ref:'scene'},
          React.createElement(changedChildComponent, this.props));
        }
    }));

    var reactinstance = React.render(changedChildSceneFactory({thingindex:1,text:'newtext'}), mountpoint);

    var scene = reactinstance.refs['scene']._THREEObject3D;
    expect(scene.children.length).toBe(1);

    // should switch from Object3D to Camera node... the old node shouldn't be
    // stashed somewhere (in _mountImage perhaps?)
    reactinstance.setProps({thingindex:2});
    expect(scene.children.length).toBe(1);

    // If buggy, this will pull the old node (Object3D) and add it in, resulting
    // in two children
    reactinstance.setProps({text:'ack'});
    expect(scene.children.length).toBe(1); // might be 0 or 2 if buggy
  });
});
