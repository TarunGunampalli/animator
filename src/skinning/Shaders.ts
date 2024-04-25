export const floorVSText = `
    precision mediump float;

    uniform vec4 uLightPos;
    uniform mat4 uWorld;
    uniform mat4 uView;
    uniform mat4 uProj;
    
    attribute vec4 aVertPos;

    varying vec4 vClipPos;

    void main () {

        gl_Position = uProj * uView * uWorld * aVertPos;
        vClipPos = gl_Position;
    }
`;

export const floorFSText = `
    precision mediump float;

    uniform mat4 uViewInv;
    uniform mat4 uProjInv;
    uniform vec4 uLightPos;

    varying vec4 vClipPos;

    void main() {
        vec4 wsPos = uViewInv * uProjInv * vec4(vClipPos.xyz/vClipPos.w, 1.0);
        wsPos /= wsPos.w;
        /* Determine which color square the position is in */
        float checkerWidth = 5.0;
        float i = floor(wsPos.x / checkerWidth);
        float j = floor(wsPos.z / checkerWidth);
        vec3 color = mod(i + j, 2.0) * vec3(1.0, 1.0, 1.0);

        /* Compute light fall off */
        vec4 lightDirection = uLightPos - wsPos;
        float dot_nl = dot(normalize(lightDirection), vec4(0.0, 1.0, 0.0, 0.0));
	    dot_nl = clamp(dot_nl, 0.0, 1.0);
	
        gl_FragColor = vec4(clamp(dot_nl * color, 0.0, 1.0), 1.0);
    }
`;

export const sceneVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute vec2 aUV;
    attribute vec3 aNorm;
    attribute vec4 skinIndices;
    attribute vec4 skinWeights;
    attribute vec4 v0;
    attribute vec4 v1;
    attribute vec4 v2;
    attribute vec4 v3;
    
    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;
 
    uniform vec4 lightPosition;
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    uniform vec3 jTrans[64];
    uniform vec4 jRots[64];

    vec4 multQuat(vec3 vt, vec4 qr) {
        vec4 qt = vec4(vt.xyz, 0);
        vec3 vr = vec3(qr.xyz);
        float w = qt.w * qr.w - dot(vt, vr);
        vec3 v = qt.w * vr + qr.w * vt + cross(vt, vr);
        vec4 q = vec4(v.xyz, w);
        return q;
    }

    vec3 computeVertex(vec4 v4, vec4 qd, vec4 qr) {
        vec3 v = vec3(v4.xyz);
        vec3 t = vec3(qd.xyz);
        vec3 r = vec3(qr.xyz);
        return v + 2.0 * cross(r, cross(r, v) + qr.w * v) + 2.0 * (qr.w * t - qd.w * r + cross(r, t));
    }

    void main () {
        vec4 qdx = skinWeights.x * 0.5 * multQuat(jTrans[int(skinIndices.x)], jRots[int(skinIndices.x)]);
        vec4 qdy = skinWeights.y * 0.5 * multQuat(jTrans[int(skinIndices.y)], jRots[int(skinIndices.y)]);
        vec4 qdz = skinWeights.z * 0.5 * multQuat(jTrans[int(skinIndices.z)], jRots[int(skinIndices.z)]);
        vec4 qdw = skinWeights.w * 0.5 * multQuat(jTrans[int(skinIndices.w)], jRots[int(skinIndices.w)]);
        vec4 qd = qdx + qdy + qdz + qdw;
  
        vec4 qrx = skinWeights.x * jRots[int(skinIndices.x)];
        vec4 qry = skinWeights.y * jRots[int(skinIndices.y)];
        vec4 qrz = skinWeights.z * jRots[int(skinIndices.z)];
        vec4 qrw = skinWeights.w * jRots[int(skinIndices.w)];
        vec4 qr = qrx + qry + qrz + qrw;
        float l = length(qr);
        qd /= l;
        qr /= l;

        vec4 vPos = skinWeights.x * v0;
        vPos += skinWeights.y * v1;
        vPos += skinWeights.z * v2;
        vPos += skinWeights.w * v3;

        vec3 v = computeVertex(vPos, qd, qr);

        vec4 worldPosition = mWorld * vec4(v.xyz, 1.0);
        gl_Position = mProj * mView * worldPosition;
        
        //  Compute light direction and transform to camera coordinates
        lightDir = lightPosition - worldPosition;
        
        vec4 aNorm4 = vec4(aNorm, 0.0);
        normal = normalize(mWorld * vec4(aNorm, 0.0));

        uv = aUV;
    }
    
`;

export const sceneFSText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;


    void main () {
        gl_FragColor = vec4((normal.x + 1.0)/2.0, (normal.y + 1.0)/2.0, (normal.z + 1.0)/2.0,1.0);
    }
`;

export const sceneFSTextureText = `
    precision mediump float;

    varying vec4 lightDir;
    varying vec2 uv;
    varying vec4 normal;

    uniform sampler2D tex;

    void main () {
        gl_FragColor = texture2D(tex, uv);
    }
`;

export const skeletonVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    attribute float boneIndex;
    
    uniform mat4 mWorld;
    uniform mat4 mView;
    uniform mat4 mProj;

    uniform vec3 bTrans[64];
    uniform vec4 bRots[64];

    vec3 qtrans(vec4 q, vec3 v) {
        return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);
    }

    void main () {
        int index = int(boneIndex);
        gl_Position = mProj * mView * mWorld * vec4(bTrans[index] + qtrans(bRots[index], vertPosition), 1.0);
    }
`;

export const skeletonFSText = `
    precision mediump float;

    void main () {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
`;

export const sBackVSText = `
    precision mediump float;

    attribute vec2 vertPosition;

    varying vec2 uv;

    void main() {
        gl_Position = vec4(vertPosition, 0.0, 1.0);
        uv = vertPosition;
        uv.x = (1.0 + uv.x) / 2.0;
        uv.y = (1.0 + uv.y) / 2.0;
    }
`;

export const sBackFSText = `
    precision mediump float;

    varying vec2 uv;

    void main () {
        gl_FragColor = vec4(0.1, 0.1, 0.1, 1.0);
        // gl_FragColor = vec4(0.145, 0.369, 0.373, 1.0);
        if (abs(uv.y-.33) < .005 || abs(uv.y-.67) < .005) {
            gl_FragColor = vec4(1, 1, 1, 1);
        }
    }

`;
export const cylinderVSText = `
    precision mediump float;

    attribute vec3 aVertPos;

    uniform mat4 uView;
    uniform mat4 uProj;
    
    uniform mat4 uScale;
    uniform vec4 uRot;
    uniform mat4 uTrans;

    vec3 qtrans(vec4 q, vec3 v) {
        return v + 2.0 * cross(cross(v, q.xyz) - q.w*v, q.xyz);
    }

    void main() {
        vec4 scaled = uScale * vec4(cos(aVertPos.x), aVertPos.y, sin(aVertPos.x), 1.0);
        vec3 rotated = qtrans(uRot, vec3(scaled.xyz));
        gl_Position = uProj * uView * uTrans * vec4(rotated.xyz, 1.0);
    }
`;

export const cylinderFSText = `
    precision mediump float;

    void main () {
        gl_FragColor = vec4(0.408, 0.9, 0.831, 1.0);
    }
`;

export const keyFramesVSText = `
    precision mediump float;

    attribute vec2 vertPosition;
    uniform vec2 origin;
    varying vec2 uv;
    uniform float w;
    varying float opacity;

    void main() {
        gl_Position = vec4(vertPosition, 0.0, 1.0);
        uv = (vertPosition - origin);
        uv.x *= 0.6;
        uv.y *= 2.0;
        opacity = w;
    }
`;

export const keyFramesFSText = `
    precision mediump float;

    uniform sampler2D tex;
    varying vec2 uv;
    varying float opacity;

    void main () {
        gl_FragColor = texture2D(tex, uv);
        gl_FragColor = vec4(gl_FragColor.xyz, opacity);
        if (uv.x > 0.96 || uv.x < 0.015 || uv.y > 0.955 || uv.y < 0.02) {
            gl_FragColor = vec4(1.0, 0.3, 0.3, 1);
        }
    }
`;

export const timelineVSText = `
    precision mediump float;

    attribute vec2 vertPosition;
    attribute float index;
    uniform vec4 colors[64];
    varying vec4 color;
    

    void main() {
        gl_Position = vec4(vertPosition, 0.0, 1.0);
        color = colors[int(index)];
        
    }
`;

export const timelineFSText = `
    precision mediump float;

    varying vec4 color;

    void main () {
        gl_FragColor = color;
    }
`;

export const scrubberVSText = `
    precision mediump float;

    attribute vec3 vertPosition;
    uniform mat3 trans;

    void main() {
        vec3 v = trans * vertPosition;
        gl_Position = vec4(v.xy, 0.0, 1.0);
    }
`;

export const scrubberFSText = `
    precision mediump float;

    void main () {
        gl_FragColor = vec4(1.0, 0.5, 0.5, 1.0);
    }
`;
