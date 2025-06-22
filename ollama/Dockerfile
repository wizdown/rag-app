# Stage 1: The builder stage to download the models
FROM ollama/ollama:latest AS builder

# Download the specified models
# This single RUN command starts the server, pulls models, and then stops the server.
RUN sh -c "ollama serve & \
    sleep 10 && \
    ollama pull phi3:mini-128k && \
    ollama pull nomic-embed-text && \
    pkill ollama"

# Stage 2: The final production image
FROM ollama/ollama:latest

# Copy the pre-downloaded models from the builder stage
COPY --from=builder /root/.ollama/models /root/.ollama/models

# Expose the default Ollama port
EXPOSE 11434

# Corrected CMD: Provide only the argument to the image's ENTRYPOINT
CMD ["serve"]