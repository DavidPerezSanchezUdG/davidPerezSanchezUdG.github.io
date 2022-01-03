let EPSILON = 0.0005;

let Screen = {
    width 	: 0,
    height 	: 0,
    canvas 	: null,
    context : null,
    buffer 	: null,
};

function Material(Ma, Md, Ms, shininess, Mm, Mr) {
    this.Ma = Ma;
    this.Md = Md;
    this.Ms = Ms;
    this.shininess = shininess;
    this.Mm = Mm;
    this.Mr = Mr;
}
let Materials = {
    yellow: new Material([0.1,0.1,0],[0.6,0.6,0],[0.1,0.1,0],10,0,0),
    blue: new Material([0,0,0.1],[0,0,0.6],[0,0,0.1],10,0,0),
    red: new Material([0.1,0,0],[0.6,0,0],[0.1,0,0],50,0,0),
    green: new Material([0,0.1,0],[0,0.6,0],[0,0.5,0],50,0,0),
    black: new Material([0,0,0],[0.01,0.01,0.01],[0.1,0.1,0.1],50,0,0),
    glass: new Material([0.05,0.05,0.075],[0.05,0.05,0.075],[50,50,75],1000,0.05,0.85),
    chrome: new Material([0.05,0.05,0.05],[0.1,0.1,0.1],[100,100,100],200,0.6,0)
}
function Light(position, La, Ld, Ls) {
    this.position = position;
    this.La = La;
    this.Ld = Ld;
    this.Ls = Ls;
}

class Shape {
    constructor(id, material) {
        this.id = id;
        this.material = material;
        this.type = "Shape";
    }

    intersect(ray){};
}
class Plane extends Shape {
    constructor(id, normal, center, material) {
        super(id, material);
        this.normal = normal;
        this.center = center;
        this.type = "Plane";
    }

    intersect(ray) {
        const denom = vec3.dot(this.normal, ray.direction);
        if(EPSILON < Math.abs(denom)) { // If ray and plane are not parallel
            const diff = vec3.subtract(this.center, ray.origin);
            const t = vec3.dot(diff, this.normal) / denom;
            if(0 <= t) {
                const intersectionPoint = vec3.add(ray.origin, vec3.scale(ray.direction, t));
                return new Intersection(intersectionPoint, t, this.normal, this);
            }
        }
        return null;
    }
}
class Sphere extends Shape {
    constructor(id, center, radius, material) {
        super(id, material);
        this.radius = radius;
        this.center = center;
        this.type = "Sphere";
    }

    intersect(ray) {
        const r = this.radius;
        const centre = this.center;
        const o = ray.origin;
        const v = ray.direction;

        const diff = vec3.subtract(o, this.center);
        const ldiff = vec3.length(diff);
        const a = 1;
        const b = 2 * vec3.dot(diff, v);
        const c = ldiff*ldiff - r*r;

        const discriminant = b*b - 4*a*c;
        if(discriminant < 0) { // There is no intersection
            return null;
        }
        else {
            let t = (-b -Math.sqrt(discriminant)) / (2*a);
            if(EPSILON <= t) {
                let intersectionPoint = vec3.add(o, vec3.scale(v, t));
                let normal = vec3.scale(vec3.subtract(intersectionPoint, centre),1/r);
                return new Intersection(intersectionPoint, t, normal, this);
            }
            else return null;
        }
    }
}
class Triangle extends Shape {
    constructor(id, v0, v1, v2, material) {
        super(id, material);
        this.v0 = v0;
        this.v1 = v1;
        this.v2 = v2;
        this.type = "Triangle";
    }

    intersect(ray) {
        // Moller-Trumbore intersection algorithm
        const v0tov1 = vec3.subtract(this.v1, this.v0);
        const v0tov2 = vec3.subtract(this.v2, this.v0);
        const pvec = vec3.cross(ray.direction, v0tov2);
        const det = vec3.dot(v0tov1, pvec);
        if(Math.abs(det) < EPSILON) // Ray and triangle are parallel
            return null;
        const invDet = 1/det;
        const tvec = vec3.subtract(ray.origin, this.v0);
        const u = vec3.dot(tvec, pvec) * invDet;
        if(u < 0 || u > 1)
            return null;
        const qvec = vec3.cross(tvec, v0tov1);
        const v = vec3.dot(ray.direction, qvec) * invDet;
        if(v < 0 || u + v > 1)
            return null;
        const t = vec3.dot(v0tov2, qvec) * invDet;
        if(EPSILON <= t) {
            const intersectionPoint = vec3.add(ray.origin, vec3.scale(ray.direction, t));
            const normal = vec3.cross(v0tov1, v0tov2);
            return new Intersection(intersectionPoint, t, normal, this);
        }
    }
}

let savedPois = [
    {
        name: "Reset view",
        eye: [0,1,0],
        center: [0,1,-1],
        up: [0,1,0],
    },
    {
        name: "Back",
        eye: [0,1,-6],
        center: [0,1,-5],
        up: [0,1,0],
    },
    {
        name: "Side right",
        eye: [4,1,-3],
        center: [3,1,-3],
        up: [0,1,0],
    },
    {
        name: "Side left",
        eye: [-4,1,-3],
        center: [-3,1,-3],
        up: [0,1,0],
    },
    {
        name: "Chrome near",
        eye: [0.91,1,-2.58],
        center: [0.06,1,-3.13],
        up: [0,1,0],
    },
    {
        name: "Chrome very near",
        eye: [0.52,0.92,-2.77],
        center: [-0.31,1.08,-3.31],
        up: [0.14,0.99,0.09],
    },
    {
        name: "Green near",
        eye: [1.73,0.38,-0.58],
        center: [0.89,0.38,-1.12],
        up: [0,1,0],
    },
    {
        name: "Glass near",
        eye: [0,0.3,-1],
        center: [0,0.3,-2],
        up: [0,1,0],
    },
    {
        name: "Side ground",
        eye: [1.71,0.06,-1.98],
        center: [0.98,0.49,-2.51],
        up: [0.33,0.9,0.28],
    }
]

let Scene = {
    Fons: [135/255/2, 206/255/2, 235/255/2],
    Shapes: [
        new Plane("terra",[0,1,0],[0,0,0], Materials.yellow),
        new Sphere("chrome1",[0,0.6,-3],0.6, Materials.chrome),
        new Sphere("chrome2",[-1,2,-3],0.6, Materials.chrome),
        new Sphere("chrome3",[1,2,-3],0.6, Materials.chrome),
        new Sphere("smallSphere1",[1,0.25,1],0.25, Materials.red),
        new Sphere("smallSphere2",[1,0.25,0],0.25, Materials.blue),
        new Sphere("smallSphere3",[1,0.25,-1],0.25, Materials.green),
        new Sphere("smallSphere4",[1,0.25,-2],0.25, Materials.red),
        new Sphere("smallSphere5",[1,0.25,-3],0.25, Materials.blue),
        new Sphere("smallSphere6",[1,0.25,-4],0.25, Materials.green),
        new Triangle("redTriangle",[-1.5,0,-2],[-0.75,0,-2],[-0.8725,1,-4],Materials.red),
        new Triangle("blueTriangle",[-1,0,-1.5],[-0.75,0,-1.5],[-0.8725,1,-1.5],Materials.blue),
        new Sphere("glass",[0,0.3,-1.5],0.25, Materials.glass)
    ],
    Camera: {
        state: savedPois[0],
        front: [0,0,-1],
        right: [1,0,0],
        fov : 75,
        pois: savedPois,
        getPois() {
            return this.pois;
        },
        restorePoi(name) {
            let poi = this.pois.find(x => x.name === name);
            this.state = JSON.parse(JSON.stringify(poi));
            this.computeAxis();
        },
        computeAxis() {
          this.front = vec3.normalize(vec3.subtract(this.state.center, this.state.eye));
          this.right = vec3.normalize(vec3.cross(this.front, this.state.up));
        },
        moveX(amount) {
            let right = vec3.scale(this.right,amount);
            this.state.eye = vec3.add(this.state.eye,right);
            this.state.center = vec3.add(this.state.center,right);
        },
        moveY(amount) {
            let up = vec3.scale(this.state.up,amount);
            this.state.eye = vec3.add(this.state.eye,up);
            this.state.center = vec3.add(this.state.center,up);
        },
        moveZ(amount) {
            let front = vec3.scale(this.front, amount);
            this.state.eye = vec3.add(this.state.eye,front);
            this.state.center = vec3.add(this.state.center,front);
        },
        rotateAround(amountDeg,vecToRotate,axis) {
            let R = mat4.create();
            R = mat4.rotate(R,R,glMatrix.toRadian(amountDeg),axis)
            let vecToRotate4 = vec4.fromValues(vecToRotate[0],vecToRotate[1],vecToRotate[2],0);
            vec4.transformMat4(vecToRotate4,vecToRotate4,R);
            return vec3.normalize(vec3.fromValues(vecToRotate4[0], vecToRotate4[1], vecToRotate4[2]));
        },
        rotateX(amountDeg) {
            this.front = this.rotateAround(amountDeg,this.front,this.right);
            this.state.up = this.rotateAround(amountDeg,this.state.up,this.right);
            this.state.center = vec3.add(this.state.eye,this.front);
        },
        rotateY(amountDeg) {
            this.front = this.rotateAround(amountDeg,this.front,this.state.up);
            this.right = this.rotateAround(amountDeg,this.right,this.state.up);
            this.state.center = vec3.add(this.state.eye,this.front);
        },
        rotateZ(amountDeg) {
            this.state.up = this.rotateAround(-amountDeg,this.state.up,this.front);
            this.right = this.rotateAround(-amountDeg,this.right,this.front);
        }
    },
    Lights: [
        new Light([-1, 5, 4],[0.2, 0.2, 0.2],[0.6, 0.6, 0.6],[0.2, 0.2, 0.2]),
        new Light([2, 3, 0],[0.2, 0.2, 0.2],[0.6, 0.6, 0.6],[0.2, 0.2, 0.2]),
    ]
};