// The grittyfx palette lookup. Data sheet per pixel: R color index, G color alpha, B light index, A light intensity.
// rgb = pal[ci] * ca + pal[li] * lk, alpha = ca, blended premultiplied so light adds even where alpha is 0.
shader_type canvas_item;
render_mode blend_premul_alpha, unshaded;

// The data sheet through its own uniform, so no color conversion meant for TEXTURE applies to it. GLES3 shares one
// filter per texture between TEXTURE and this uniform: the node sets its texture_filter to Nearest to match.
uniform sampler2D data : filter_nearest, repeat_disable;
uniform sampler2D palette : filter_nearest, repeat_disable;
uniform float light_gain = 1.0;
uniform float fade = 1.0;

vec3 lookup(float index) {
	return texture(palette, vec2((round(index * 255.0) + 0.5) / 256.0, 0.5)).rgb;
}

void fragment() {
	vec4 d = texture(data, UV);
	float ca = d.g * fade;
	float lk = d.a * light_gain * fade;
	COLOR = vec4(lookup(d.r) * ca + lookup(d.b) * lk, ca);
}
