import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { OpenAPIObject } from '@nestjs/swagger';
import request from 'supertest';
import { AppModule } from './app.module';
import { PrismaService } from './prisma/prisma.service';

describe('Swagger contract', () => {
  it('documents every published operation with resolved schemas', async () => {
    process.env.JWT_ACCESS_SECRET ??= 'test-access-secret';
    process.env.JWT_REFRESH_SECRET ??= 'test-refresh-secret';
    process.env.JWT_ACCESS_EXPIRES_IN ??= '7m';
    process.env.JWT_REFRESH_EXPIRES_IN ??= '7d';
    process.env.REFRESH_TOKEN_TTL_MS ??= '604800000';
    process.env.REFRESH_COOKIE_NAME ??= 'cartech_refresh_token';

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue({})
      .compile();
    const app = moduleRef.createNestApplication();
    const config = new DocumentBuilder()
      .setTitle('CarTech API')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth(
        'cartech_refresh_token',
        { type: 'apiKey', in: 'cookie' },
        'refreshToken',
      )
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
    await app.init();

    await request(app.getHttpServer()).get('/api/docs').expect(200);

    expect(Object.keys(document.paths).sort()).toEqual(
      [
        '/',
        '/auth/login',
        '/auth/change-initial-password',
        '/auth/logout',
        '/auth/me',
        '/auth/refresh',
        '/cars',
        '/cars/tasks',
        '/cars/{id}',
        '/cars/{id}/battery-check',
        '/cars/{id}/issue',
        '/cars/{id}/pso',
        '/cars/{id}/pso/complete',
        '/dashboard',
        '/locations',
        '/locations/{id}',
        '/locations/{id}/deactivate',
        '/locations/{locationId}/sites',
        '/locations/{locationId}/sites/{siteId}',
        '/locations/{locationId}/sites/{siteId}/deactivate',
        '/operations/arrivals',
        '/users',
        '/users/{id}',
        '/users/{id}/activate',
        '/users/{id}/deactivate',
        '/users/{id}/location-access',
        '/users/{id}/roles',
        '/users/{id}/reset-password',
      ].sort(),
    );

    for (const pathItem of Object.values(document.paths)) {
      for (const operation of Object.values(pathItem ?? {})) {
        if (!isOperation(operation)) continue;
        expect(operation.summary).toBeTruthy();
        expect(operation.description).toBeTruthy();
        expect(Object.keys(operation.responses ?? {}).length).toBeGreaterThan(
          0,
        );
      }
    }

    const schemas = document.components?.schemas ?? {};
    for (const reference of collectSchemaReferences(document)) {
      expect(schemas).toHaveProperty(reference);
    }

    expect(document.paths['/auth/login']?.post?.requestBody).toBeDefined();
    expect(
      document.paths['/operations/arrivals']?.post?.requestBody,
    ).toBeDefined();
    expect(
      document.paths['/cars/{id}/battery-check']?.post?.requestBody,
    ).toBeDefined();
    expect(document.paths['/cars/{id}']?.patch?.requestBody).toBeDefined();
    expect(document.paths['/cars/{id}']?.patch?.responses).toHaveProperty(
      '409',
    );
    expect(
      document.paths['/users/{id}/location-access']?.put?.requestBody,
    ).toBeDefined();
    expect(document.paths['/users']?.post?.requestBody).toBeDefined();
    expect(
      document.paths['/users/{id}/reset-password']?.post?.requestBody,
    ).toBeDefined();
    expect(
      document.paths['/auth/change-initial-password']?.post?.requestBody,
    ).toBeDefined();
    expect(document.components?.securitySchemes).toHaveProperty('bearer');
    expect(document.components?.securitySchemes).toHaveProperty('refreshToken');
    expect(schemas).toHaveProperty('UpdateCarIdentityDto');
    expect(schemas).toHaveProperty('CarDetailsResponseDto');

    await app.close();
  });
});

function isOperation(value: unknown): value is {
  summary?: string;
  description?: string;
  responses?: Record<string, unknown>;
} {
  return typeof value === 'object' && value !== null && 'responses' in value;
}

function collectSchemaReferences(document: OpenAPIObject): string[] {
  const serialized = JSON.stringify(document);
  const references = serialized.matchAll(/"#\/components\/schemas\/([^"]+)"/g);
  return [...references].map((match) => match[1]);
}
