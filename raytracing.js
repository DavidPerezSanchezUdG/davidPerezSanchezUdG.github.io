// Structs
function Ray(origin, direction) {
    this.origin = origin;
    this.direction = direction;
}
function Intersection(point, t, normal, object) {
    this.point = point;
    this.t = t;
    this.normal = normal
    this.shape = object;
}

// RAY TRACING CODE
function rayTracing(Scene, ray, depth) {
    const hit = closestIntersection(Scene, ray);
    if(!hit) return Scene.Fons;
    else return computeIllumination(Scene, ray, hit, depth);
}
function closestIntersection(Scene, ray) {
    let minT = Number.POSITIVE_INFINITY;
    let closest = null;

    Scene.Shapes.forEach(shape => {
        let intersection = shape.intersect(ray);
        if (intersection != null && intersection.t < minT) {
            closest = intersection;
            minT = closest.t;
        }
    })

    return closest;
}
function isLightVisible(Scene, ray) {
    let isAny = false;
    for (let i = 0; i < Scene.Shapes.length; i++) {
        let intersection = Scene.Shapes[i].intersect(ray);
        if(intersection != null && EPSILON < intersection.t) { // TODO 1??
            isAny = true;
            break;
        }
    }
    return isAny;
}
function computeIllumination(Scene, ray, hit, depth) {
    const shape = hit.shape
    let color = [0,0,0];

    // Compute V vector
    const V = vec3.normalize(vec3.negate(ray.direction));

    Scene.Lights.forEach(light => {
        // Compute L and R vectors
        const L = vec3.normalize(vec3.subtract(light.position, hit.point))
        const dotLNx2 = vec3.dot(L, hit.normal) * 2;
        const NxdotLNx2 = vec3.scale(hit.normal, dotLNx2);
        const R = vec3.normalize(vec3.subtract(NxdotLNx2, L));

        // Ambient
        const ambient = vec3.multiply(shape.material.Ma, light.La);
        color = vec3.add(color, ambient);

        // Check if hit point is in shadow
        const lightRay = new Ray(hit.point, L);
        const isInShadow = isLightVisible(Scene, lightRay);
        if (!isInShadow) {
            // Diffuse
            const dotNL = vec3.dot(hit.normal, L);
            let diffuse = vec3.multiply(shape.material.Md, light.Ld);
            diffuse = vec3.scale(diffuse, Math.max(0, dotNL));
            color = vec3.add(color, diffuse);

            // Specular
            const dotRV = vec3.dot(R, V);
            let specular = vec3.multiply(shape.material.Ms, light.Ls);
            specular = vec3.scale(specular, Math.pow(Math.max(0, dotRV), shape.material.shininess));
            color = vec3.add(color, specular);
        }

        if(depth > 0) {
            // Compute reflection
            const reflectionDir = computeReflection(ray.direction, hit.normal);
            const reflectionRay = new Ray(hit.point, reflectionDir);
            const reflection = vec3.scale(rayTracing(Scene, reflectionRay, depth-1), shape.material.Mm);
            color = vec3.add(color, reflection);

            // Compute refraction
            const refractionDir = computeRefraction(ray.direction, hit.normal, shape.material.Mr);
            const refractionRay = new Ray(hit.point,refractionDir);
            const refraction = vec3.scale(rayTracing(Scene, refractionRay, depth-1), shape.material.Mr);
            color = vec3.add(color, refraction);
        }
    })

    return color;
}
function computeReflection(vec, normal) {
    const dot = vec3.dot(vec,normal);
    const scaledNormal = vec3.scale(normal, dot*2);
    return vec3.normalize(vec3.subtract(vec, scaledNormal));
}
function computeRefraction(vec, normal, eta) {
    const dot = vec3.dot(normal, vec);
    const k = 1 - eta * eta * (1 - dot * dot);
    if(k < 0)
        return [0,0,0];
    else {
        const scaledNormal = vec3.scale(normal, eta * dot * Math.sqrt(k));
        const scaledVec = vec3.scale(vec, eta);
        return vec3.normalize(vec3.subtract(scaledVec, scaledNormal));
    }
}