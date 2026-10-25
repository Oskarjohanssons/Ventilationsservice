# Build the React app first so the published API can serve it from wwwroot.
FROM node:24-slim AS web-build
WORKDIR /web
COPY src/Ventilationsservice.Web/package*.json ./
RUN npm ci
COPY src/Ventilationsservice.Web/ ./
RUN npm run build

# Publish the .NET API.
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api-build
WORKDIR /src
COPY src/Ventilationsservice.Api/Ventilationsservice.Api.csproj src/Ventilationsservice.Api/
RUN dotnet restore src/Ventilationsservice.Api/Ventilationsservice.Api.csproj
COPY . .
RUN dotnet publish src/Ventilationsservice.Api/Ventilationsservice.Api.csproj \
    --configuration Release \
    --no-restore \
    --output /app/publish \
    /p:UseAppHost=false
COPY --from=web-build /web/dist/ /app/publish/wwwroot/

# Small runtime image for Render's free web service.
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS final
WORKDIR /app
COPY --from=api-build /app/publish/ ./
EXPOSE 10000
ENTRYPOINT ["sh", "-c", "ASPNETCORE_URLS=http://0.0.0.0:${PORT:-10000} exec dotnet Ventilationsservice.Api.dll"]
