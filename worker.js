importScripts("gl-matrix/common.js","gl-matrix/vec3.js", "gl-matrix/vec4.js",
              "gl-matrix/mat4.js", "scene.js","raytracing.js");

Scene = {};
onmessage = function (oEvent) {
    if(oEvent.data.type === "init") {
        Scene.Fons = oEvent.data.fons;
        Scene.Lights = oEvent.data.lights;
        let shapes = oEvent.data.shapes;
        Scene.Shapes = [];
        for (let i = 0; i < shapes.length; i++) {
            const s = shapes[i];
            const type = s.type;
            if(type === "Plane")
                Scene.Shapes[i] = new Plane(s.id,s.normal,s.center,s.material);
            else if(type === "Sphere")
                Scene.Shapes[i] = new Sphere(s.id,s.center,s.radius,s.material);
            else if(type === "Triangle")
                Scene.Shapes[i] = new Triangle(s.id,s.v0,s.v1,s.v2,s.material);
            else throw new Error("Undefined shape type");
        }
    }
    else {
        let ray = oEvent.data.ray;
        let depth = oEvent.data.depth;
        let x = oEvent.data.x;
        let y = oEvent.data.y;

        let data = {
            x: x,
            y: y,
            color: rayTracing(Scene, ray, depth)
        }
        postMessage(data);
    }
};