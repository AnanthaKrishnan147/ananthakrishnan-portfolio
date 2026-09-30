from openrouter import OpenRouter


async def complete(client: OpenRouter, model: str, system_prompt: str, message: str) -> str:
    response = await client.chat.send_async(
        model=model,
        temperature=0.2,
        stream=False,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ],
    )
    return response.choices[0].message.content or "I couldn't form a response just now. Please try again."
