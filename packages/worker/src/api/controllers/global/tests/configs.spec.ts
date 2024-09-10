import * as pro from "@budibase/pro"
import { verifyAIConfig } from "../configs"
import { TestConfiguration, structures } from "../../../../tests"

describe("Global configs controller", () => {
  const config = new TestConfiguration()

  beforeAll(async () => {
    await config.beforeAll()
  })

  afterAll(async () => {
    await config.afterAll()
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it("Should strip secrets when pulling AI config", async () => {
    const data = structures.configs.ai()
    await config.api.configs.saveConfig(data)
    const response = await config.api.configs.getAIConfig()
    expect(response.body.config).toEqual({
      ai: {
        active: true,
        apiKey: "--secret-value--",
        baseUrl: "https://api.example.com",
        defaultModel: "gpt4",
        isDefault: false,
        name: "Test",
        provider: "OpenAI"
      }
    })
  })

  it("Should return the default BB AI config when the feature is turned on", async () => {
    jest
      .spyOn(pro.features, "isBudibaseAIEnabled")
      .mockImplementation(() => true)
    const data = structures.configs.ai()
    await config.api.configs.saveConfig(data)
    const response = await config.api.configs.getAIConfig()

    expect(response.body.config).toEqual({
      budibase_ai: {
        provider: "OpenAI",
        active: true,
        isDefault: true,
        name: "Budibase AI",
      },
      ai: {
        active: true,
        apiKey: "--secret-value--",
        baseUrl: "https://api.example.com",
        defaultModel: "gpt4",
        isDefault: false,
        name: "Test",
        provider: "OpenAI"
      },
    })
  })

  it("Should not not return the default Budibase AI config when on self host", async () => {
    jest
      .spyOn(pro.features, "isBudibaseAIEnabled")
      .mockImplementation(() => false)
    const data = structures.configs.ai()
    await config.api.configs.saveConfig(data)
    const response = await config.api.configs.getAIConfig()

    expect(response.body.config).toEqual({
      ai: {
        active: true,
        apiKey: "--secret-value--",
        baseUrl: "https://api.example.com",
        defaultModel: "gpt4",
        isDefault: false,
        name: "Test",
        provider: "OpenAI"
      },
    })
  })

  it("Should not update existing secrets when updating an existing AI Config", async () => {
    const data = structures.configs.ai()
    await config.api.configs.saveConfig(data)
    const existingConfig = await config.api.configs.getAIConfig()

    const newConfig = {
      type: "ai",
      config: {
        aiconfig: {
          provider: "OpenAI",
          isDefault: true,
          name: "MyConfig",
          active: true,
          defaultModel: "gpt4",
          apiKey: "myapikey",
        },
      },
    }

    await verifyAIConfig(newConfig, existingConfig)
    // should be unchanged
    expect(newConfig.config.aiconfig.apiKey).toEqual("myapikey")
  })
})
