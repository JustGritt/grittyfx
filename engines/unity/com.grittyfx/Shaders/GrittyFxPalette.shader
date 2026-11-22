// The grittyfx composite (src/core/fx.js) on a SpriteRenderer, URP 2D or Universal renderer:
// rgb = pal[R] * G + pal[B] * A * gain, alpha = G, premultiplied so light adds even where alpha is 0.
Shader "GrittyFx/Palette"
{
    Properties
    {
        [NoScaleOffset] _MainTex ("Data sheet", 2D) = "black" {}
        [NoScaleOffset] _Palette ("Palette (256 x 1, sRGB off)", 2D) = "black" {}
        _Gain ("Light gain", Float) = 1
    }

    SubShader
    {
        Tags { "Queue" = "Transparent" "RenderType" = "Transparent" "RenderPipeline" = "UniversalPipeline" "PreviewType" = "Plane" }
        Blend One OneMinusSrcAlpha
        Cull Off
        ZWrite Off

        Pass
        {
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_instancing
            #include "Packages/com.unity.render-pipelines.universal/Shaders/2D/Include/Core2D.hlsl"
            #include "Packages/com.unity.render-pipelines.core/ShaderLibrary/Color.hlsl"

            TEXTURE2D(_MainTex);
            TEXTURE2D(_Palette);
            CBUFFER_START(UnityPerMaterial)
                float _Gain;
            CBUFFER_END

            struct Attributes
            {
                float3 positionOS : POSITION;
                float2 uv : TEXCOORD0;
                float4 color : COLOR;
                UNITY_VERTEX_INPUT_INSTANCE_ID
            };

            struct Varyings
            {
                float4 positionCS : SV_POSITION;
                float2 uv : TEXCOORD0;
                float fade : TEXCOORD1;
            };

            Varyings vert(Attributes v)
            {
                UNITY_SETUP_INSTANCE_ID(v);
                SetUpSpriteInstanceProperties();
                Varyings o;
                // SpriteRenderer.flipX mirrors about the pivot, the sprite's local origin.
                o.positionCS = TransformObjectToHClip(UnityFlipSprite(v.positionOS, unity_SpriteProps.xy));
                o.uv = v.uv;
                o.fade = v.color.a * unity_SpriteColor.a;
                return o;
            }

            float3 Pal(float index)
            {
                return SAMPLE_TEXTURE2D(_Palette, sampler_PointClamp, float2((index * 255 + 0.5) / 256, 0.5)).rgb;
            }

            float4 frag(Varyings i) : SV_Target
            {
                float4 d = SAMPLE_TEXTURE2D(_MainTex, sampler_PointClamp, i.uv);
                float ca = d.g * i.fade;
                float3 rgb = Pal(d.r) * ca + Pal(d.b) * (d.a * _Gain * i.fade);
            #if !defined(UNITY_COLORSPACE_GAMMA)
                // The reference blends sRGB values: converting the premultiplied result keeps it exact over black and
                // wherever color alpha is 1; translucent pixels over a lit background blend in linear light instead.
                rgb = SRGBToLinear(rgb);
            #endif
                return float4(rgb, ca);
            }
            ENDHLSL
        }
    }
}
